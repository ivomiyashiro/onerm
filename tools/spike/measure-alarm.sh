#!/bin/bash
# SPIKE #14: taps Start, reads the alarm from dumpsys, optionally locks or forces Doze, prints window and delay.
# Usage: tools/spike/measure-alarm.sh [lock|doze]   (coordinates are for the Pixel_10 spike screen)
export PATH=$HOME/Library/Android/sdk/platform-tools:$PATH
adb shell input keyevent 224; sleep 1; adb shell wm dismiss-keyguard; sleep 1
adb shell input tap 538 405; sleep 2
line=$(adb shell dumpsys alarm | grep -A2 "com.training.onerm}" | head -3)
when=$(echo "$line" | grep -o "origWhen [0-9]*" | head -1 | cut -d' ' -f2)
[ -n "$when" ] || { echo "no alarm scheduled"; exit 1; }
echo "window: $(echo "$line" | grep -o 'window=[^ ]*' | head -1)"
[ "$1" = "lock" ] || [ "$1" = "doze" ] && adb shell input keyevent 26
[ "$1" = "doze" ] && { adb shell dumpsys battery unplug; adb shell dumpsys deviceidle force-idle >/dev/null; }
until ! adb shell dumpsys alarm | grep -q "origWhen $when"; do sleep 0.3; done
fired=$(python3 -c 'import time;print(int(time.time()*1000))')
echo "delay_ms=$((fired-when)) ($1)"
[ "$1" = "doze" ] && { adb shell dumpsys deviceidle unforce >/dev/null; adb shell dumpsys battery reset; }
