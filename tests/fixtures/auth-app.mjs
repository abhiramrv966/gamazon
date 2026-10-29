// A single-process Next.js server keeps the auth test fixture disposable on Windows.
import next from 'next';
import { createServer } from 'node:http';
const app = next({ dev: true, hostname: '127.0.0.1', port: 3001 });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((request, response) => handle(request, response));
server.listen(3001, '127.0.0.1');
process.on('SIGTERM', () => {
  server.close();
  void app.close().finally(() => process.exit(0));
});
