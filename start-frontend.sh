#!/bin/bash
cd /home/tenbox/CKAnim/front
npx vite > /tmp/ckanim-front.log 2>&1 &
echo "前台已启动，PID: $!"

cd /home/tenbox/CKAnim/admin
npx vite > /tmp/ckanim-admin.log 2>&1 &
echo "后台已启动，PID: $!"
