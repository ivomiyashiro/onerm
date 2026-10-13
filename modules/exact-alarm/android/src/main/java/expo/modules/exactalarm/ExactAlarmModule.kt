package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Exact alarms on Android 12+ (RN-ENT-07, spike #14): expo-notifications schedules an exact alarm
 * only when the system allows it, and doesn't say whether it does.
 */
class ExactAlarmModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    Function("canScheduleExactAlarms") {
      // Before Android 12 exact alarms need no permission.
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarms.canScheduleExactAlarms()
    }

    // «Alarmas y recordatorios» for this app (D17).
    Function("openSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        .setData(Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}
