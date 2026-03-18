#!/bin/bash
cd /home/tenbox/CKAnim
rm -rf node_modules/.vite
nohup node node_modules/.bin/vite --host 0.0.0.0 > /tmp/vite-5173.log 2>&1 &
echo "Vite 启动命令已执行"
sleep 5
echo "---日志---"
cat /tmp/vite-5173.log
echo "---进程---"
ps aux | grep vite | grep -v grep
echo "---端口---"
lsof -ti:5173 || echo "端口未监听"
