const { runCron } = require('../lib/railway-cron.cjs');

runCron()
  .then((result) => console.log(result))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
