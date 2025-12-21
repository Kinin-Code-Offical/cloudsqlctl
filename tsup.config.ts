import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
    entry: ['src/cli.ts'],
    format: ['cjs'],
    target: 'node22',
    clean: true,
    minify: true,
    dts: false,
    sourcemap: false,
    shims: true,
    splitting: false,
    define: {
        'process.env.CLOUDSQLCTL_VERSION': JSON.stringify(pkg.version),
    },
    noExternal: [/(.*)/], // Bundle everything
    outExtension() {
        return {
            js: '.cjs',
        };
    },
});
