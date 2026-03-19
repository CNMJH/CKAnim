#!/bin/bash
cd /home/tenbox/CKAnim/server
nohup npx tsx src/index.ts > /tmp/ckanim-server.log 2>&1 &
echo "后端服务已启动，PID: $!"
