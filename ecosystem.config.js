/**
 * CKAnim PM2 配置文件
 * 
 * 使用方法:
 * 1. 安装 PM2: npm install -g pm2
 * 2. 构建项目: npm run build (前台) && cd admin && npm run build
 * 3. 启动服务: pm2 start ecosystem.config.js
 * 4. 查看状态: pm2 status
 * 5. 查看日志：pm2 logs
 * 6. 重启服务：pm2 restart all
 * 7. 停止服务：pm2 stop all
 */

module.exports = {
  apps: [
    {
      /**
       * 后端 API 服务
       * 端口：3002
       */
      name: 'ckanim-server',
      cwd: './server',
      script: 'node_modules/.bin/tsx',
      args: 'watch src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: ['src/'],
      ignore_watch: ['node_modules', 'logs', '*.log'],
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        JWT_SECRET: process.env.JWT_SECRET || 'ckanim-production-secret-key-change-me',
        JWT_EXPIRES_IN: '7d',
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      /**
       * 前台网站
       * 端口：5173
       * 注意：生产环境应该使用 build 后的静态文件 + Nginx
       */
      name: 'ckanim-front',
      cwd: './',
      script: 'node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 5173',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: ['src/', 'public/', 'index.html'],
      ignore_watch: ['node_modules', 'logs', '*.log'],
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/front-error.log',
      out_file: './logs/front-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      /**
       * 管理后台
       * 端口：3003
       * 注意：生产环境应该使用 build 后的静态文件 + Nginx
       */
      name: 'ckanim-admin',
      cwd: './admin',
      script: 'node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 3003',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: ['src/', 'public/', 'index.html'],
      ignore_watch: ['node_modules', 'logs', '*.log'],
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
