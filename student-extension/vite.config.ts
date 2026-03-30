import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path, { resolve } from 'path';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url))


export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                'content/content-script': resolve(__dirname, 'content/content-script.tsx'),
                'background/service-worker': resolve(__dirname, 'background/service-worker.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
    define: {
        'import.meta.env.VITE_API_URL': JSON.stringify(
            process.env.VITE_API_URL || 'https://booth-terms-detective-las.trycloudflare.com'
        ),
        'import.meta.env.VITE_WS_URL': JSON.stringify(
            process.env.VITE_WS_URL || 'https://booth-terms-detective-las.trycloudflare.com'
        ),
    },
});
