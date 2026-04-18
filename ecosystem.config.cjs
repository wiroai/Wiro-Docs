const path = require("path");

module.exports = {
  apps: [
    {
      name: "wiro-docs",
      script: "serve.js",
      cwd: path.resolve(__dirname),
      interpreter: "node",
      interpreter_args: "--max-http-header-size=16384",
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: "cluster",
      max_memory_restart: "512M",
      wait_ready: true,
      listen_timeout: 10000,
      cron_restart: "0 5 * * *",
      restart_delay: 4000,
      max_open_files: 65536,
      env: {
        NODE_ENV: "local",
        PORT: 8000,
      },
      env_prod: {
        NODE_ENV: "prod",
        PORT: 8000,
        UV_THREADPOOL_SIZE: 8,
        NODE_OPTIONS: "--max-old-space-size=512",
      },
      env_dev: {
        NODE_ENV: "dev",
        PORT: 8000,
        UV_THREADPOOL_SIZE: 4,
        NODE_OPTIONS: "--max-old-space-size=256",
      },
      env_stg: {
        NODE_ENV: "stg",
        PORT: 8000,
        UV_THREADPOOL_SIZE: 4,
        NODE_OPTIONS: "--max-old-space-size=256",
      },
      error_file: "../deploy/logs/pm2-docs-error.log",
      out_file: "../deploy/logs/pm2-docs-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "30s",
      kill_timeout: 30000,
    },
  ],
};
