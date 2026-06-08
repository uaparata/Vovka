const http = require('http');
const handler = require('serve-handler');
const path = require('path');

const port = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname);

const server = http.createServer((req, res) =>
  handler(req, res, {
    public: publicDir,
    headers: [
      {
        source: '**/*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: 'index.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ],
  })
);

server.listen(port, '0.0.0.0', () => {
  console.log(`Fauck Zini running on http://0.0.0.0:${port}`);
});
