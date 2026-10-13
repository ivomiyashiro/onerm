import ExpoModulesCore

// iOS: scheduled notifications need no exact alarm permission (RN-ENT-07).
public class ExactAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExactAlarm")

    Function("canScheduleExactAlarms") { () -> Bool in
      true
    }

    Function("openSettings") {}
  }
}
