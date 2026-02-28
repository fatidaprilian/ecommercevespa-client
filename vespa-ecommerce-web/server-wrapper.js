/**
 * Advanced Server Wrapper for Next.js Standalone + Cloudflare
 * 
 * 1. Overrides KeepAliveTimeout to 120s to surpass Cloudflare's 100s timeout.
 * 2. Overrides HeadersTimeout to 121s.
 * 3. Logs incoming requests for debugging 522 issues.
 */

const http = require('http');
const https = require('https');

// Cloudflare's keep-alive timeout is usually 100s (100,000ms).
// Node.js must keep the connection open slightly longer than Cloudflare
// otherwise Node closes the connection while CF is about to reuse it ~ 522 Error.
const KEEPALIVE_TIMEOUT = 120000;
const HEADERS_TIMEOUT = 121000;

function patchServer(ServerClass, protocol) {
    const originalListen = ServerClass.prototype.listen;
    ServerClass.prototype.listen = function (...args) {
        this.keepAliveTimeout = KEEPALIVE_TIMEOUT;
        this.headersTimeout = HEADERS_TIMEOUT;
        console.log(`[server-wrapper] Applied ${protocol} keepAliveTimeout: ${this.keepAliveTimeout}ms`);

        // Hook into 'request' to log what's actually hitting Node.js
        this.on('request', (req, res) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                // Only log static assets or API to reduce noise, or log everything if needed.
                // But for diagnosing 522 on statics, let's log everything quickly:
                if (req.url.includes('/_next/static/')) {
                    console.log(`[static-access] ${res.statusCode} ${req.method} ${req.url} - ${duration}ms`);
                }
            });
        });

        return originalListen.apply(this, args);
    };
}

patchServer(http.Server, 'HTTP');
patchServer(https.Server, 'HTTPS');

console.log('[server-wrapper] Booting up Next.js standalone server...');
require('./server.js');
