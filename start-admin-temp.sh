#!/bin/bash
cd /home/tenbox/CKAnim/admin
npm run dev > /tmp/ckanim-admin.log 2>&1 &
echo "后台 Vite 启动中..."
sleep 8
tail -15 /tmp/ckanim-admin.log
