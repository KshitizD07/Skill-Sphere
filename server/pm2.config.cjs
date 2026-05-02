module.exports = {
  apps: [
    {
      name:         'skillsphere-api',
      script:       'index.js',
      instances:    'max',      // one process per CPU core
      exec_mode:    'cluster',  // Node cluster module — shared port
      watch:        false,

      env: {
        NODE_ENV: 'development',
        PORT:     5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     5001,
      },

      // Auto-restart on crash
      autorestart:   true,
      max_restarts:  10,
      restart_delay: 2000,

      // Memory limit — restart if process exceeds 512 MB
      max_memory_restart: '512M',

      // Logs
      out_file:   './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Zero-downtime deploys
      kill_timeout:     5000,
      listen_timeout:   10000,
      wait_ready:       true,
    },
  ],
};