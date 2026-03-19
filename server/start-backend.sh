#!/bin/bash
cd /home/tenbox/CKAnim/server
npx tsx src/index.ts > /tmp/ckanim-server.log 2>&1 &
echo "后端已启动，PID: $!"
