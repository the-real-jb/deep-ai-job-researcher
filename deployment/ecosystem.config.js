// PM2 Ecosystem configuration for AI-Assisted Job Hunter
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [{
    name: 'resume-hunter',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/resume-hunter', // UPDATE THIS PATH
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
