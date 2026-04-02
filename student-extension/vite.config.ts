import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import path, { resolve } from 'path';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url))


export default defineConfig(({ mode }) => {
    // Load env file from the root directory
    const env = loadEnv(mode, path.resolve(__dirname, '../'), '');
    
    return {
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
            'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
            'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL),
        },
    };
});
