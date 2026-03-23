/**
 * CKAnim PM2 配置文件（生产环境）
 * 
 * 使用方法:
 * 1. 修改下方的配置（JWT_SECRET、七牛云配置等）
 * 2. 安装 PM2: npm install -g pm2
 * 3. 构建项目：npm run build (前台) && cd admin && npm run build
 * 4. 启动服务：pm2 start ecosystem.config.js
 * 5. 查看状态：pm2 status
 * 6. 查看日志：pm2 logs
 * 7. 重启服务：pm2 restart all
 * 8. 停止服务：pm2 stop all
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
      args: 'src/index.ts',  // 生产环境不使用 watch
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        
        // ⚠️ JWT 配置 - 必须修改！
        JWT_SECRET: 'Rz9gthBgwWwXFRgNbbwtnMFTfoqACtqZHNEWdRHenFU=',
        JWT_EXPIRES_IN: '7d',
        
        // ⚠️ 七牛云配置 - 必须修改！
        QINIU_ACCESS_KEY: '7SQACfWTDUZdDgJFlRZGRbKQDIHUFGilt_H3UE2L',
        QINIU_SECRET_KEY: 'LTaPJ6mK_LDudhkxJRmvLmdpnr-PLoL1gvOGDvfn',
        QINIU_BUCKET: 'zhuque-guangdong',
        QINIU_DOMAIN: 'http://video.jiangmeijixie.com',
        QINIU_PREFIX: '参考网站 2026/',
        
        // 数据库配置
        DATABASE_URL: 'file:/var/www/ckanim/server/prisma/dev.db',
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
       * 当前使用 Vite 预览模式
       */
      name: 'ckanim-front',
      cwd: './',
      script: 'node_modules/.bin/vite',
      args: 'preview --host 0.0.0.0 --port 5173',  // 使用 preview 模式
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
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
       * 当前使用 Vite 预览模式
       */
      name: 'ckanim-admin',
      cwd: './admin',
      script: 'node_modules/.bin/vite',
      args: 'preview --host 0.0.0.0 --port 3003',  // 使用 preview 模式
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
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
