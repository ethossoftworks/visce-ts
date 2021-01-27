export interface RouterLocation {
    push(path: string, title?: string): void // Push a new location onto the history stack
    replace(path: string, title?: string): void // Replace the current location onto the history stack
    back(): void // Go back in history
    forward(): void // Go forward in history

    origin(): string // Protocol + Host + Port
    path(): string // Full path beginning with "/"
    query(): string // Full query beginning with "?"
    hash(): string // Hash beginning with "#"
}

export const browserLocation: RouterLocation = Object.freeze({
    push: (path: string, title: string = "") => history.pushState(null, title, path),
    replace: (path: string, title: string = "") => history.replaceState(null, title, path),
    back: () => history.back(),
    forward: () => history.forward(),

    origin: () => location.origin,
    path: () => location.pathname,
    query: () => location.search,
    hash: () => location.hash,
})

export const testLocation = (url: URL): RouterLocation => {
    let _url = url
    let index = 0
    let history = [url]

    return {
        push: (path: string, title: string = "") => {
            _url = new URL(path, _url.origin)
            history.push(_url)
            index++
        },
        replace: (path: string, title: string = "") => {
            _url = new URL(path, _url.origin)
            history[index] = _url
        },
        back: () => {
            index = Math.max(0, index - 1)
        },
        forward: () => {
            index = Math.min(history.length - 1, index + 1)
        },

        origin: () => history[index].origin,
        path: () => history[index].pathname,
        query: () => history[index].search,
        hash: () => history[index].hash,
    }
}
