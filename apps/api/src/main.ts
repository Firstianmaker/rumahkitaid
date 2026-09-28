import { createApp } from './app';
createApp()
  .then(async ({ app }) => {
    await app.listen(Number(process.env.PORT || 4000), '127.0.0.1');
    console.log('RumahKita API: http://localhost:' + (process.env.PORT || 4000) + '/api/docs');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
