import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type {
    CreateRuntimeServerOptions,
    NitroModule,
    NitroNodeListener,
    RuntimeServer,
} from './types'
import { existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function toAbsolutePath(path: string): string {
    return isAbsolute(path) ? path : resolve(process.cwd(), path)
}

function resolveNitroEntry(inputPath: string): string {
    const absolutePath = toAbsolutePath(inputPath)

    if (!existsSync(absolutePath)) {
        throw new Error(`Runtime path does not exist: ${absolutePath}`)
    }

    const stat = statSync(absolutePath)

    const entryPath = stat.isDirectory()
        ? resolve(absolutePath, 'server/index.mjs')
        : absolutePath

    if (!existsSync(entryPath)) {
        throw new Error(`Nitro entry not found: ${entryPath}`)
    }

    return entryPath
}

function pickNitroListener(mod: NitroModule): NitroNodeListener {
    const listener
        = mod.listener
            ?? mod.middleware
            ?? mod.handler
            ?? mod.default

    if (typeof listener !== 'function') {
        throw new TypeError(
            'Cannot find a valid Nitro node listener export. '
            + 'Expected one of: listener, middleware, handler, default.',
        )
    }

    return listener as NitroNodeListener
}

async function loadNitroEntrypoint(path: string): Promise<{ listener: NitroNodeListener, websocket: unknown }> {
    const entryPath = resolveNitroEntry(path)
    const mod = await import(pathToFileURL(entryPath).href) as NitroModule

    return {
        listener: pickNitroListener(mod),
        websocket: mod.websocket,
    }
}

function listen(server: Server, host: string, port: number): Promise<number> {
    return new Promise<number>((res, rej) => {
        server.once('error', rej)
        server.listen(port, host, () => {
            server.off('error', rej)
            const address = server.address() as AddressInfo
            res(address.port)
        })
    })
}

function closeServer(server: Server): Promise<void> {
    return new Promise<void>((res, rej) => {
        server.close((error) => {
            if (error) {
                rej(error)
                return
            }
            res()
        })
    })
}

async function setupWebSocket(
    server: Server,
    websocket: unknown,
): Promise<void> {
    if (!websocket) {
        return
    }

    const { default: nodeAdapter } = await import('crossws/adapters/node')
    const { handleUpgrade } = nodeAdapter(websocket as Parameters<typeof nodeAdapter>[0])

    server.on('upgrade', (req, socket, head) => {
        handleUpgrade(req, socket, head)
    })
}

export async function createRuntimeServer(
    options: CreateRuntimeServerOptions,
): Promise<RuntimeServer> {
    const port = options.port ?? 7777
    const host = options.host ?? '127.0.0.1'

    const nitro = await loadNitroEntrypoint(options.path)

    const server = createServer(async (req, res) => {
        try {
            await nitro.listener(req, res)
        }
        catch (error) {
            if (!res.headersSent) {
                res.statusCode = 500
                res.setHeader('content-type', 'text/plain; charset=utf-8')
            }

            const message = error instanceof Error
                ? (error.stack ?? error.message)
                : String(error)

            res.end(message)
        }
    })

    await setupWebSocket(server, nitro.websocket)
    const actualPort = await listen(server, host, port)

    return {
        server,
        url: `http://${host}:${actualPort}`,
        close: () => closeServer(server),
    }
}
