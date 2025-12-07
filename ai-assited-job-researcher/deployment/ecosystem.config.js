// PM2 Ecosystem configuration for AI-Assisted Job Hunter
// https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// This is a TEMPLATE file. Do not modify directly on the server.
// The deployment script will use this to generate ecosystem.config.local.js

module.exports = {
  apps: [{
    name: 'resume-hunter',
    script: 'npm',
    args: 'start',
    cwd: '__APP_DIR__', // Will be replaced during deployment
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3030,
      HOSTNAME: '0.0.0.0'
    },
    error_file: '/var/log/pm2/resume-hunter-error.log',
    out_file: '/var/log/pm2/resume-hunter-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
