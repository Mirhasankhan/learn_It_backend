module.exports = {
  apps: [
    {
      name: "muath_backend",
      script: "./dist/server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "muath_subscription_worker",
      script: "./dist/workers/subscription.workers.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "muath_fifteen_worker",
      script: "./dist/workers/fifteen.worker.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "muath_oneHour_worker",
      script: "./dist/workers/oneHour.worker.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "muath_markExpired_worker",
      script: "./dist/workers/markExpired.worker.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
