package expo.modules.restcountdown

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The rest counting down with the screen locked (#305): an ongoing notification whose countdown
 * the system draws from the absolute end, with no process in the background (RNF-22). It removes
 * itself at the end, when the notice of expo-notifications takes over.
 */
class RestCountdownModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val manager: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun definition() = ModuleDefinition {
    Name("RestCountdown")

    Function("show") { endsAtMs: Double, title: String, body: String, channelName: String ->
      val left = endsAtMs.toLong() - System.currentTimeMillis()
      if (left <= 0) {
        manager.cancel(TAG, ID)
        return@Function
      }
      ensureChannel(channelName)
      val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(resource("notification_icon", "drawable", context.applicationInfo.icon))
        .setColor(color())
        .setContentTitle(title)
        .setContentText(body)
        .setWhen(endsAtMs.toLong())
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setTimeoutAfter(left)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setContentIntent(openApp())
        .build()
      // Without POST_NOTIFICATIONS (Android 13+) the system drops it.
      manager.notify(TAG, ID, notification)
    }

    Function("hide") {
      manager.cancel(TAG, ID)
    }
  }

  // Default importance, but without sound or vibration: the lock screen hides silent (low
  // importance) notifications by default. The notice at the end has its own channel to sound.
  private fun ensureChannel(name: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_DEFAULT)
    channel.setSound(null, null)
    channel.enableVibration(false)
    channel.setShowBadge(false)
    manager.createNotificationChannel(channel)
  }

  // The icon and color that expo-notifications generates from app.config.ts (#293).
  private fun resource(name: String, type: String, fallback: Int): Int =
    context.resources.getIdentifier(name, type, context.packageName).takeIf { it != 0 } ?: fallback

  private fun color(): Int {
    val id = resource("notification_icon_color", "color", 0)
    return if (id == 0) NotificationCompat.COLOR_DEFAULT else context.getColor(id)
  }

  private fun openApp(): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(
      context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private companion object {
    const val CHANNEL_ID = "rest-running"
    const val TAG = "rest-countdown"
    const val ID = 1
  }
}
