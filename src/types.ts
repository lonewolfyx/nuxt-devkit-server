import type { IncomingMessage, Server, ServerResponse } from 'node:http'

export type MaybePromise<T> = T | Promise<T>

export type NitroNodeListener = (
    req: IncomingMessage,
    res: ServerResponse,
) => MaybePromise<void>

export interface NitroModule {
    listener?: unknown
    middleware?: unknown
    handler?: unknown
    default?: unknown
    websocket?: unknown
}

export interface CreateRuntimeServerOptions {
    /**
     * Nitro / Nuxt build output directory, or the direct path to server/index.mjs.
     *
     * Supported:
     * - dist
     * - .output
     * - dist/server/index.mjs
     * - .output/server/index.mjs
     */
    path: string

    /**
     * Server port, defaults to 7777
     */
    port?: number

    /**
     * Server listen address, defaults to 127.0.0.1
     */
    host?: string
}

export interface RuntimeServer {
    server: Server
    url: string
    close: () => Promise<void>
}
