import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['electron/main.ts', 'electron/preload.ts'],
    format: ['cjs'],
    outDir: 'dist-electron',
    external: ['electron', 'sqlite3'],
    noExternal: [],
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    clean: true,
});
