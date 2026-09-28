// Optional Windows runtime mirror: keeps build artifacts and dependencies off a full system drive.
const fs = require('node:fs'),
  path = require('node:path'),
  { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..'),
  runtime = process.env.RUMAHKITA_RUNTIME;
if (!runtime)
  throw new Error('Set RUMAHKITA_RUNTIME to the dependencies workspace on the secondary drive');
const source = path.join(root, 'apps/web'),
  target = path.join(runtime, 'apps/web');
const ignored = ['.next', 'node_modules', 'test-results', 'playwright-report', 'test'];
const allowed = (file) =>
  !file.split(/[\\/]/).some((x) => ignored.includes(x)) && !file.endsWith('.tsbuildinfo');
const sync = () => {
  fs.cpSync(source, target, {
    recursive: true,
    preserveTimestamps: true,
    filter: (p) => allowed(path.relative(source, p)),
  });
  fs.cpSync(path.join(root, 'packages/api-client'), path.join(runtime, 'packages/api-client'), {
    recursive: true,
    preserveTimestamps: true,
  });
};
sync();
if (process.argv.includes('--sync-only')) process.exit(0);
const mode = process.env.RUMAHKITA_WEB_MODE || 'dev';
const pending = new Set();
let timer;
if (mode === 'dev')
  fs.watch(source, { recursive: true }, (_, file) => {
    if (file && allowed(file)) {
      pending.add(file);
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const name of pending) {
          const from = path.join(source, name),
            to = path.join(target, name);
          if (fs.existsSync(from)) {
            fs.mkdirSync(path.dirname(to), { recursive: true });
            fs.cpSync(from, to, { recursive: true, preserveTimestamps: true });
          }
        }
        pending.clear();
      }, 200);
    }
  });
const child = spawn(
  process.execPath,
  [
    path.join(runtime, 'node_modules/next/dist/bin/next'),
    mode,
    ...(mode === 'dev' ? ['--webpack'] : []),
    '-H',
    '127.0.0.1',
  ],
  { cwd: target, stdio: 'inherit', windowsHide: true },
);
child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => {
  child.kill();
  process.exit();
});

