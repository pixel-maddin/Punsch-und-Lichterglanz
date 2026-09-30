#!/bin/bash
# Nimmt Store-Screenshots im Vorführmodus auf: aufnehmen.sh <name> <demo> <datum> [breite hoehe faktor]
cd "$(dirname "$0")"
name=$1; demo=$2; datum=$3; b=${4:-540}; h=${5:-960}; f=${6:-2}
rm -rf profil_$name; rm -f $name.png
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --user-data-dir="$PWD/profil_$name" --window-size=$b,$h --force-device-scale-factor=$f \
  --virtual-time-budget=8000 --screenshot="$PWD/$name.png" \
  "http://localhost:8060/?datum=$datum&demo=$demo" >/dev/null 2>&1 &
pid=$!
for i in $(seq 1 60); do [ -s $name.png ] && break; sleep 0.5; done
sleep 1; kill $pid 2>/dev/null; pkill -f "profil_$name" 2>/dev/null
rm -rf profil_$name
ls -la $name.png
