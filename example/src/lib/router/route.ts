import { Router } from "./router"

export type RouteMap = Record<string, RouteItem>
export type RouteItem<T extends any[] = any[]> = ((...args: T) => RouteItemData) & {
    path: string
    id: Symbol
    meta: Record<string, any>
    title?: (data: RouteData) => string
}
export type RouteItemData = RouteData & { id: Symbol }

export type Route = {
    key: string
    url: string
    item: RouteItem
    data: RouteData
    title: string | null
}

export type RouteData = {
    params: Record<string, string>
    query: Record<string, string>
    hash: string
}

export const Uninitialized = Object.freeze(Object.assign(_route({ path: "" }), { key: "@Uninitialized" }))
export const PageNotFound = Object.freeze(Object.assign(_route({ path: "" }), { key: "@PageNotFound" }))

export function createRouteForData(origin: string, routes: RouteMap, itemData: RouteItemData): Route {
    for (const [key, item] of Object.entries(routes)) {
        if (!(itemData.id === item.id)) {
            continue
        }

        const data = { params: itemData.params, query: itemData.query, hash: itemData.hash }
        const title = item.title !== undefined ? item.title(data) : null
        const url = createPathForRoute(origin, { key: key, item: item, data, url: "", title })

        return { key: key, item: item, url, data, title }
    }
    return { key: PageNotFound.key, url: "", item: PageNotFound, data: PageNotFound(), title: null }
}

export function createRouteForPath(origin: string, routes: RouteMap, path: string): Route {
    const url = new URL(path, origin)
    const pathSegments = url.pathname.split("/").filter((segment) => segment !== "")
    const query = buildQueryDataObject(url)

    routeItemLoop: for (const [key, item] of Object.entries(routes)) {
        if (item.path === path) {
            const data = { params: {}, query, hash: url.hash.substr(1) }
            const title = item.title !== undefined ? item.title(data) : null

            return { key: key, item: item, url: path, data, title }
        }

        const itemPathSegments = item.path.split("/").filter((segment) => segment !== "")
        if (pathSegments.length !== itemPathSegments.length) {
            continue
        }

        const params: Record<string, string> = {}
        for (let i = 0, l = pathSegments.length; i < l; i++) {
            if (itemPathSegments[i][0] === ":") {
                params[itemPathSegments[i].substring(1)] = decodeURIComponent(pathSegments[i])
            } else if (itemPathSegments[i] !== pathSegments[i]) {
                continue routeItemLoop
            }
        }

        const data = { params, query, hash: url.hash.substr(1) }
        const title = item.title !== undefined ? item.title(data) : null

        return { key: key, item: item, url: path, data, title }
    }

    return { key: PageNotFound.key, url: path, item: PageNotFound, data: PageNotFound(), title: null }
}

function buildQueryDataObject(url: URL): Record<string, string> {
    const query: Record<string, string> = {}

    if (url.search === "") {
        return query
    }

    for (const [key, value] of url.searchParams.entries()) {
        query[key] = value
    }

    return query
}

export function createPathForRoute(origin: string, route: Route): string {
    let path = replacePathSegments(route.item.path, route.data.params)

    const url = new URL(path, origin)
    for (const [key, value] of Object.entries(route.data.query)) {
        url.searchParams.append(key, value)
    }

    url.hash = route.data.hash

    return `${url.pathname}${url.search}${url.hash}`
}

function replacePathSegments(path: string, params: Record<string, string>): string {
    for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value))
    }
    return path
}

type RouteItemCreatorReturn<T extends (...args: any) => Partial<RouteData>> = T extends ([]) => Partial<RouteData>
    ? RouteItem<[]>
    : RouteItem<Parameters<T>>

export function route<T extends (...args: any) => Partial<RouteData>>({
    path,
    data,
    title,
    meta,
}: {
    path: string
    data?: T
    meta?: Record<string, any>
    title?: (data: RouteData) => string
}): RouteItemCreatorReturn<T> {
    return Object.freeze(_route({ path, data, title, meta }))
}

function _route<T extends (...args: any) => Partial<RouteData>>({
    path,
    data,
    title,
    meta,
}: {
    path: string
    data?: T
    meta?: Record<string, any>
    title?: (data: RouteData) => string
}): RouteItemCreatorReturn<T> {
    const id = Symbol()
    const routeItem: RouteItem<Parameters<T>> = (...args: Parameters<T>) => {
        const _data = data ? data(...(args as [])) : { query: {}, params: {}, hash: "", title: null }
        return {
            id: id,
            params: _data.params || {},
            query: _data.query || {},
            hash: _data.hash || "",
        }
    }
    routeItem.path = path
    routeItem.id = id
    routeItem.title = title !== undefined ? title : undefined
    routeItem.meta = meta !== undefined ? meta : {}

    return routeItem as RouteItemCreatorReturn<T>
}

export function isRouteMatch(value: RouteItem, other: RouteItem | RouteItem[]): boolean {
    if (Array.isArray(other)) {
        for (let i = 0, l = other.length; i < l; i++) {
            if (value === other[i]) {
                return true
            }
        }
        return false
    }
    return other === value
}
