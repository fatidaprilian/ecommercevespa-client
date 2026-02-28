/**
 * Custom Server Wrapper for Next.js Standalone
 * 
 * Issue: Cloudflare 522 Connection Timed Out on Static Assets
 * Cause: Node.js default keepAliveTimeout (5s) is shorter than Cloudflare's expectation (100s).
 * When Cloudflare tries to reuse a connection that Node.js has closed, it results in a 522 error.
 * Next.js standalone mode does not natively expose server timeout configurations.
 * 
 * Fix: Patch the HTTP/HTTPS server prototype to enforce a longer keepAliveTimeout before
 * starting the Next.js server.js.
 */

const http = require('http');
const https = require('https');

const KEEPALIVE_TIMEOUT = 65000; // 65 seconds (must be > Cloudflare's 60s/100s expectation)
const HEADERS_TIMEOUT = 66000;   // 66 seconds (must be > keepAliveTimeout)

// Patch HTTP
const originalHttpListen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
    this.keepAliveTimeout = KEEPALIVE_TIMEOUT;
    this.headersTimeout = HEADERS_TIMEOUT;
    console.log(`[server-wrapper] Applied HTTP keepAliveTimeout: ${this.keepAliveTimeout}ms`);
    return originalHttpListen.apply(this, args);
};

// Patch HTTPS (just in case)
const originalHttpsListen = https.Server.prototype.listen;
https.Server.prototype.listen = function (...args) {
    this.keepAliveTimeout = KEEPALIVE_TIMEOUT;
    this.headersTimeout = HEADERS_TIMEOUT;
    console.log(`[server-wrapper] Applied HTTPS keepAliveTimeout: ${this.keepAliveTimeout}ms`);
    return originalHttpsListen.apply(this, args);
};

// Now actually run the built Next.js server
console.log('[server-wrapper] Starting Next.js standalone server...');
require('./server.js');
