const path = require("path");

module.exports = {
  apps: [
    {
      name: "wiro-docs",
      script: "serve.js",
      cwd: path.resolve(__dirname),
      interpreter: "node",
      interpreter_args: "--max-http-header-size=16384",
      instances: 1,
      // Static docs server için fork yeterli — cluster mode tek
      // instance ile sadece master + worker overhead'i yaratır ve
      // raw http.createServer + PM2 cluster shim'in IPC kanalı
      // arasında ready-signal teslim etmeyen edge case görülmüştü
      // (10s listen_timeout → SIGTERM → restart loop, 8s uptime).
      exec_mode: "fork",
      // RSS sınırı. 51MB'lik baseline için 1024M bol tampon — V8
      // heap (max-old-space-size) sınırının en az 2× olmalı, aksi
      // halde heap dolmaya başlar başlamaz RSS bu sınırı aşar ve
      // PM2 kill atar.
      max_memory_restart: "1024M",
      // Static dosya servisi anında listen oluyor; PM2'nin ready
      // sinyalini bekleyip 10s timeout → SIGTERM → restart deseni
      // bu workload için gereksiz risk. SSR / DB-bağlı app'ler için
      // anlamlı, raw http için değil.
      wait_ready: false,
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
        // Heap limit = max_memory_restart / 2. RSS = heap + native
        // (~100–200MB), bu yüzden heap'i RSS limitinin yarısında
        // tutmak gerek; aksi halde GC tetiklenmeden önce PM2 kill atar.
        NODE_OPTIONS: "--max-old-space-size=512",
      },
      env_dev: {
        NODE_ENV: "dev",
        PORT: 8000,
        UV_THREADPOOL_SIZE: 4,
        NODE_OPTIONS: "--max-old-space-size=512",
      },
      env_stg: {
        NODE_ENV: "stg",
        PORT: 8000,
        UV_THREADPOOL_SIZE: 4,
        NODE_OPTIONS: "--max-old-space-size=512",
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
