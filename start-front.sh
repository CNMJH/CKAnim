#!/bin/bash
cd /home/tenbox/CKAnim
npx vite --host 0.0.0.0 --port 5173 > /tmp/ckanim-front.log 2>&1 &
echo "前台 Vite 已启动，PID: $!"
