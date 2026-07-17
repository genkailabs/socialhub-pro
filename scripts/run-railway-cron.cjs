const { runCron, DEFAULT_TASK } = require('../lib/railway-cron.cjs');

// Tarefa por argumento (npm run cron:railway -- youtube-sync) ou por CRON_TASK.
const task = process.argv[2] || process.env.CRON_TASK || DEFAULT_TASK;

runCron(process.env, fetch, task)
  .then((result) => console.log(`[${task}] ${result}`))
  .catch((error) => {
    console.error(`[${task}] ${error.message}`);
    process.exitCode = 1;
  });
