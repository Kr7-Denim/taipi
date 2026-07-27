import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7000;

// CORS Proxy middleware
app.use('/proxy', (req, res, next) => {
    // In Express, when using app.use('/proxy', ...), req.url contains the path AFTER /proxy
    // Example: request to /proxy/https://google.com -> req.url is /https://google.com
    const targetUrl = req.url.substring(1); // remove the leading slash
    
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
        return res.status(400).send('Valid absolute URL is required after /proxy/');
    }

    // Set CORS headers for the browser
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        ignorePath: true, // We are proxying to the exact targetUrl
        on: {
            proxyReq: (proxyReq) => {
                // Strip referer and origin to avoid blocks from streaming CDNs
                proxyReq.removeHeader('referer');
                proxyReq.removeHeader('origin');
            },
            proxyRes: (proxyRes) => {
                // Ensure CORS headers are maintained from proxy response
                proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            },
            error: (err, req, res) => {
                console.error('Proxy error:', err);
                if (!res.headersSent) {
                    res.status(500).send('Proxy Error');
                }
            }
        }
    });

    proxy(req, res, next);
});

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Web TV Premium is ready!`);
});
