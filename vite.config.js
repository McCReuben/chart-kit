import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Library build. React and Recharts are peer dependencies — the
// consuming app supplies them, so they (and their deep imports) stay external.
const PEERS = ['react', 'react-dom', 'recharts'];

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: 'chart-kit',
        },
        rollupOptions: {
            external: (id) => PEERS.some((peer) => id === peer || id.startsWith(`${peer}/`)),
        },
        sourcemap: true,
    },
});
