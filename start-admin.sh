#!/bin/bash
cd /home/tenbox/CKAnim/admin
npm run dev > /tmp/ckanim-admin.log 2>&1 &
echo "后台已启动，PID: $!"
sleep 5
tail -20 /tmp/ckanim-admin.log
