'use strict';
const { createServer } = require('./cms-server');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT tidak valid.');
const server = createServer();
server.on('error', error => { console.error(`Server gagal: ${error.code || 'unknown'}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Mahabbah website: http://localhost:${server.address().port}`));
