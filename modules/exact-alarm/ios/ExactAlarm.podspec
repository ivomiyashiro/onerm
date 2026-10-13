Pod::Spec.new do |s|
  s.name           = 'ExactAlarm'
  s.version        = '0.1.0'
  s.summary        = 'Exact alarm permission (Android 12+); a no-op on iOS.'
  s.author         = ''
  s.homepage       = 'https://github.com/ivomiyashiro/onerm'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
end
