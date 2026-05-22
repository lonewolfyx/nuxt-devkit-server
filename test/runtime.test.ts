import type { RuntimeServer } from '../src'
import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createRuntimeServer } from '../src'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fixtureDir = resolve(__dirname, 'fixtures')

function httpGet(url: string): Promise<{ status: number, body: string }> {
    return new Promise((res, rej) => {
        get(url, (response) => {
            let body = ''
            response.on('data', (chunk: Uint8Array) => {
                body += Buffer.from(chunk).toString()
            })
            response.on('end', () => {
                res({ status: response.statusCode ?? 0, body })
            })
            response.on('error', rej)
        }).on('error', rej)
    })
}

describe('createRuntimeServer', () => {
    it('should start server from directory path and serve requests', async () => {
        const server = await createRuntimeServer({
            path: fixtureDir,
            port: 0,
        })

        try {
            expect(server.url).toBeTruthy()
            expect(server.server.listening).toBe(true)

            const res = await httpGet(server.url)
            expect(res.status).toBe(200)
            expect(res.body).toBe('hello from nitro fixture')
        }
        finally {
            await server.close()
        }
    })

    it('should start server from file path directly', async () => {
        const entryFile = resolve(fixtureDir, 'server/index.mjs')
        const server = await createRuntimeServer({
            path: entryFile,
            port: 0,
        })

        try {
            const res = await httpGet(server.url)
            expect(res.status).toBe(200)
            expect(res.body).toBe('hello from nitro fixture')
        }
        finally {
            await server.close()
        }
    })

    it('should throw when path does not exist', async () => {
        await expect(
            createRuntimeServer({ path: '/nonexistent/path' }),
        ).rejects.toThrow('Runtime path does not exist')
    })

    it('should throw when directory has no server/index.mjs', async () => {
        const emptyDir = resolve(__dirname, 'fixtures/empty')

        if (!existsSync(emptyDir)) {
            mkdirSync(emptyDir, { recursive: true })
        }

        await expect(
            createRuntimeServer({ path: emptyDir }),
        ).rejects.toThrow('Nitro entry not found')
    })

    it('should resolve absolute paths', async () => {
        const absolute = resolve(fixtureDir)

        const server = await createRuntimeServer({
            path: absolute,
            port: 0,
        })

        try {
            expect(server.server.listening).toBe(true)
        }
        finally {
            await server.close()
        }
    })

    it('should return correct url with custom host and port', async () => {
        const server = await createRuntimeServer({
            path: fixtureDir,
            host: '127.0.0.1',
            port: 0,
        })

        try {
            expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
        }
        finally {
            await server.close()
        }
    })

    it('should close server gracefully', async () => {
        const server = await createRuntimeServer({
            path: fixtureDir,
            port: 0,
        })

        expect(server.server.listening).toBe(true)
        await server.close()
        expect(server.server.listening).toBe(false)
    })

    it('should return 500 when listener throws', async () => {
        const tmpDir = mkdtempSync(resolve(tmpdir(), 'nuxt-devkit-test-'))
        const serverDir = resolve(tmpDir, 'server')
        mkdirSync(serverDir, { recursive: true })
        writeFileSync(
            resolve(serverDir, 'index.mjs'),
            'export function listener(_req, _res) { throw new Error("nitro internal error") }\n',
        )

        let server: RuntimeServer | undefined

        try {
            server = await createRuntimeServer({
                path: tmpDir,
                port: 0,
            })

            const res = await httpGet(server.url)
            expect(res.status).toBe(500)
            expect(res.body).toContain('nitro internal error')
        }
        finally {
            if (server) {
                await server.close()
            }
        }
    })

    it('should handle multiple concurrent requests', async () => {
        const server = await createRuntimeServer({
            path: fixtureDir,
            port: 0,
        })

        try {
            const results = await Promise.all([
                httpGet(server.url),
                httpGet(server.url),
                httpGet(server.url),
            ])

            for (const res of results) {
                expect(res.status).toBe(200)
                expect(res.body).toBe('hello from nitro fixture')
            }
        }
        finally {
            await server.close()
        }
    })
})
