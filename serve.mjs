// Локальный сервер для разработки: отдаёт файлы проекта без кэша.
// PUT /__save?name=icons/icon-512.png — записать файл (так страница-генератор сохраняет иконки).
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5182;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'PUT' && url.pathname === '/__save') {
    const target = path.join(root, url.searchParams.get('name') || '');
    if (!target.startsWith(root + path.sep)) { res.writeHead(400).end('bad name'); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.concat(chunks));
    res.writeHead(200).end('ok');
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`Шкет и Маня: http://localhost:${port}`));
