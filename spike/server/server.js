const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 8787;
const MAX_BYTES = 1024 * 1024;
const OUT = path.join(__dirname, 'uploads.jsonl');

function summarize(r) {
  const s = r.samples && r.samples[0];
  const newest = s ? `${s.startDate} v=${s.value ?? s.quantity}${s.unit ? ' ' + s.unit : ''}` : '-';
  return [
    r.receivedAt, r.event, r.type ?? '-', `app=${r.appState}`, `protected=${r.protectedData}`,
    `n=${r.sampleCount ?? '-'}`, `newest=${newest}`, `lag=${r.lagSeconds}s`,
    r.queryError ? `queryError=${r.queryError}` : '',
  ].filter(Boolean).join(' | ');
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.end('ok');
    return;
  }
  if (req.method === 'POST' && req.url === '/upload') {
    let size = 0;
    const chunks = [];
    let tooBig = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) tooBig = true;
      else chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) {
        res.writeHead(413).end('too large');
        return;
      }
      let rec;
      try {
        rec = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (rec === null || typeof rec !== 'object') throw new Error('not an object');
      } catch {
        res.writeHead(400).end('bad json');
        return;
      }
      const receivedAt = new Date().toISOString();
      const lagSeconds = rec.readAt ? Math.round((Date.parse(receivedAt) - Date.parse(rec.readAt)) / 1000) : null;
      rec = { ...rec, receivedAt, lagSeconds };
      console.log(summarize(rec));
      fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    });
    return;
  }
  res.writeHead(404).end('not found');
}).listen(PORT, () => console.log(`listening on :${PORT}`));
