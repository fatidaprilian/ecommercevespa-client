const http = require('http');

// Simpan fungsi listen asli
const originalListen = http.Server.prototype.listen;

// Override fungsi listen untuk mengatur keepAliveTimeout
http.Server.prototype.listen = function (...args) {
    // 65000ms (65 detik) sedikit di atas batas Traefik/Cloudflare, 
    // agar Node.js tidak memutus duluan
    this.keepAliveTimeout = 65000;
    this.headersTimeout = 66000;

    console.log('[Server Wrapper] Berhasil menerapkan patch keepAliveTimeout=65s untuk Cloudflare compatibility.');
    return originalListen.apply(this, args);
};

// Jalankan standalone server bawaan Next.js
require('./server.js');
