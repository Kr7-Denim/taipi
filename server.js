import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7000;

// CORS Proxy middleware
const proxy = createProxyMiddleware({
    target: 'http://localhost', // Fallback target
    router: (req) => {
        try {
            const targetUrl = req.url.substring(1);
            if (!targetUrl.startsWith('http')) return null;
            const parsed = new URL(targetUrl);
            return parsed.origin;
        } catch (e) {
            return null;
        }
    },
    pathRewrite: (path, req) => {
        try {
            const targetUrl = path.substring(1);
            if (!targetUrl.startsWith('http')) return path;
            const parsed = new URL(targetUrl);
            return parsed.pathname + parsed.search;
        } catch (e) {
            return path;
        }
    },
    changeOrigin: true,
    secure: false, // Bypasses strict SSL checks which often cause ECONNRESET on CDNs
    ws: true,
    on: {
        proxyReq: (proxyReq, req, res) => {
            // Explicitly set Host header to match SNI
            try {
                const targetUrl = req.url.substring(1);
                if (targetUrl.startsWith('http')) {
                    const parsed = new URL(targetUrl);
                    proxyReq.setHeader('Host', parsed.host);
                }
            } catch (e) {}

            // Strip referer and origin to avoid blocks from strict CDNs
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('origin');
            
            // Add a common User-Agent if none exists to prevent being blocked by Cloudflare
            if (!proxyReq.getHeader('user-agent')) {
                proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            }
        },
        proxyRes: (proxyRes, req, res) => {
            // Ensure CORS headers are maintained from proxy response
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = '*';
        },
        error: (err, req, res) => {
            console.error('Proxy routing error:', err.message);
            if (!res.headersSent) {
                res.status(500).send('Proxy Error');
            }
        }
    }
});

// Use the proxy middleware
app.use('/proxy', (req, res, next) => {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', '*');
        return res.sendStatus(200);
    }
    
    // Check if valid URL
    const targetUrl = req.url.substring(1);
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
        return res.status(400).send('Valid absolute URL is required after /proxy/');
    }
    
    proxy(req, res, next);
});

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback (Catch-all)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Web TV Premium is ready!`);
});
