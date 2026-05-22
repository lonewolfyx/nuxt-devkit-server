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
     * Nitro / Nuxt 构建产物目录，或者直接传 server/index.mjs 文件路径。
     *
     * 支持：
     * - dist
     * - .output
     * - dist/server/index.mjs
     * - .output/server/index.mjs
     */
    path: string

    /**
     * 服务端口，默认 7777
     */
    port?: number

    /**
     * 服务监听地址，默认 127.0.0.1
     */
    host?: string
}

export interface RuntimeServer {
    server: Server
    url: string
    close: () => Promise<void>
}
