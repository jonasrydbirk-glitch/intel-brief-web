module.exports = {
  apps: [
    {
      name: 'warden',
      script: 'npm',
      args: 'run warden',
      cwd: './',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      windowsHide: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
