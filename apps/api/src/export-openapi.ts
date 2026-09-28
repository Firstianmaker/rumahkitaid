import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app';
createApp(false).then(async ({ app, document }) => {
  const dir = resolve(__dirname, '../../../packages/api-client');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'openapi.json'), JSON.stringify(document, null, 2));
  await app.close();
});
