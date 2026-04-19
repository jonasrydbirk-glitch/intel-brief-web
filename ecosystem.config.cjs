module.exports = {
  apps: [
    {
      name: 'warden',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'engine/warden.ts',
      interpreter: 'node',
      cwd: './',
      autorestart: true,
      max_restarts: 50,
      restart_delay: 5000,
      windowsHide: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
