# nuxt-devkit-server

A lightweight Node.js library for creating a local HTTP server that runs Nitro/Nuxt build outputs in CLI tools.

It dynamically imports the Nitro server entry point from a build output directory, wraps it in a `node:http` server, and optionally sets up WebSocket support via `crossws`.

## Installation

```bash
pnpm add nuxt-devkit-server
```

If you need WebSocket support, install `crossws` as well:

```bash
pnpm add crossws
```

## Usage

### Basic

```ts
import { createRuntimeServer } from 'nuxt-devkit-server'

const app = await createRuntimeServer({
    path: '.output',
})

console.log(`Server running at ${app.url}`) // http://127.0.0.1:7777

// Close the server when done
await app.close()
```

### Custom Host and Port

```ts
const app = await createRuntimeServer({
    path: '.output/server/index.mjs',
    host: '0.0.0.0',
    port: 3000,
})
```

### Using the `onReady` Callback

```ts
const app = await createRuntimeServer({
    path: 'dist',
    onReady({ info, app, port }) {
        console.log(`Listening on ${info.address}:${port}`)
    },
})
```

### Direct Path to Server Entry

You can pass either a Nitro build output directory or a direct path to `server/index.mjs`:

```ts
// Directory — automatically resolves to <path>/server/index.mjs
const app = await createRuntimeServer({ path: '.output' })

// Direct file path
const app = await createRuntimeServer({ path: 'dist/server/index.mjs' })
```

## API Reference

### `createRuntimeServer(options): Promise<RuntimeServer>`

Creates and starts an HTTP server backed by a Nitro/Nuxt build output.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `options` | `CreateRuntimeServerOptions` | Yes | — | Configuration options |

Returns a `Promise<RuntimeServer>` that resolves once the server is listening.

---

### `CreateRuntimeServerOptions`

```ts
interface CreateRuntimeServerOptions {
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
     * Server port.
     * Defaults to a dynamic port in the range [7777, 9000].
     */
    port?: number

    /**
     * Server listen address.
     * Defaults to '127.0.0.1'.
     */
    host?: string

    /**
     * Callback fired once the server is listening.
     */
    onReady?: (info: {
        info: AddressInfo
        app: RuntimeServer
        port: number
    }) => void
}
```

### `RuntimeServer`

```ts
interface RuntimeServer {
    /** The underlying Node.js HTTP server instance. */
    server: Server

    /** The full URL of the running server (e.g. http://127.0.0.1:7777). */
    url: string

    /** Gracefully shuts down the server. */
    close: () => Promise<void>
}
```

### `NitroModule`

The shape of a dynamically imported Nitro server module.

```ts
interface NitroModule {
    listener?: unknown
    middleware?: unknown
    handler?: unknown
    default?: unknown
    websocket?: unknown
}
```

The library resolves the HTTP handler in priority order: `listener` > `middleware` > `handler` > `default`.

### `NitroNodeListener`

The type of a Nitro HTTP handler function.

```ts
type NitroNodeListener = (
    req: IncomingMessage,
    res: ServerResponse,
) => MaybePromise<void>
```

### `MaybePromise<T>`

A value that may or may not be a promise.

```ts
type MaybePromise<T> = T | Promise<T>
```

## Development

```bash
# Install dependencies
pnpm install

# Start development with watch mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint

# Build for production
pnpm build
```

## License

[MIT](./LICENSE) &copy; [lonewolfyx](https://github.com/lonewolfyx)
