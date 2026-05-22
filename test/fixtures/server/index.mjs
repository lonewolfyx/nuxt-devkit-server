export function listener(req, res) {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('hello from nitro fixture')
}
