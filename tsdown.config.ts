import { defineConfig } from 'tsdown'

export default defineConfig({
    format: 'esm',
    dts: true,
    clean: true,
    sourcemap: false,
    deps: {
        neverBundle: [
            'crossws/adapters/node',
        ],
    },
})
