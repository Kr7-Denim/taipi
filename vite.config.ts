import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import https from 'https'

// Custom Vite plugin to handle dynamic CORS proxying
const corsProxyPlugin = () => {
  return {
    name: 'cors-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url.startsWith('/proxy/')) {
          return next();
        }

        // Extract target URL from path: /proxy/https://example.com/stream.mpd
        const targetUrl = req.url.substring(7); // remove /proxy/
        
        if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
          res.statusCode = 400;
          return res.end('Valid absolute URL is required after /proxy/');
        }

        const client = targetUrl.startsWith('https') ? https : http;
        
        const headers = { ...req.headers };
        delete headers.host;
        delete headers.origin;
        delete headers.referer;
        
        const proxyReq = client.request(targetUrl, {
          method: req.method,
          headers: headers
        }, (proxyRes: any) => {
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          
          Object.keys(proxyRes.headers).forEach((key) => {
             res.setHeader(key, proxyRes.headers[key]);
          });
          
          res.writeHead(proxyRes.statusCode);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err: any) => {
          console.error('Proxy Error for URL', targetUrl, err);
          res.statusCode = 500;
          res.end('Proxy Error');
        });

        req.pipe(proxyReq);
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin()],
})
