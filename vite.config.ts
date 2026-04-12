import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: 'custom-favicon',
      configureServer(server) {
        server.middlewares.use('/favicon.ico', (_req, res) => {
          res.setHeader('Content-Type', 'image/svg+xml');
          res.end(fs.readFileSync(path.resolve('static/favicon.svg')));
        });
      }
    }
  ]
});
