import { browserLocation, RouterLocation } from "./location"
import {
    createPathForRoute,
    createRouteForData,
    createRouteForPath,
    PageNotFound,
    Route,
    RouteItemData,
    RouteMap,
    Uninitialized,
} from "./route"

export type RouterState = Omit<Route, "item">

export function createRouteForRouterState(state: RouterState): Route {
    return withRouter((router) => {
        return {
            ...state,
            item: state.key === PageNotFound.key ? PageNotFound : router.routes[state.key] || PageNotFound,
        }
    })
}

export class Router {
    private readonly initialState = { key: Uninitialized.key, url: "", data: Uninitialized(), title: null }
    private _state: RouterState = this.initialState
    private listeners: ((state: RouterState) => void)[] = []
    private location: RouterLocation = browserLocation
    routes: RouteMap = {}

    get origin(): string {
        return this.location.origin()
    }

    get state(): RouterState {
        return { ...this._state }
    }

    init(routes: RouteMap, location: RouterLocation = browserLocation) {
        this.routes = routes
        this.location = location || browserLocation

        window.addEventListener("popstate", (ev) => {
            this.urlChanged(`${this.location.path()}${this.location.query()}${this.location.hash()}`)
        })

        this.urlChanged(`${this.location.path()}${this.location.query()}${this.location.hash()}`)
    }

    listen(block: (state: RouterState) => void): () => void {
        this.listeners.push(block)
        return () => this.listeners.splice(this.listeners.indexOf(block), 1)
    }

    navigate(route: RouteItemData | string, replace: boolean = false) {
        const _route =
            typeof route === "string"
                ? createRouteForPath(this.origin, this.routes, route)
                : createRouteForData(this.origin, this.routes, route)

        this.updateState({
            key: _route.key,
            url: _route.url,
            data: _route.data,
            title: _route.title,
        })

        const path =
            _route.item === PageNotFound && _route.data.params.path !== undefined
                ? _route.data.params.path
                : createPathForRoute(this.origin, _route)

        if (path === `${this.location.path()}${this.location.query()}${this.location.hash()}`) return

        this.setTitleForRoute(_route)

        if (replace) {
            this.location.replace(path, "")
        } else {
            this.location.push(path, "")
        }
    }

    back() {
        this.location.back()
    }

    forward() {
        this.location.forward()
    }

    private urlChanged(url: string) {
        const _route = createRouteForPath(this.origin, this.routes, url)
        this.setTitleForRoute(_route)

        this.updateState({
            key: _route.key,
            url: _route.url,
            data: _route.data,
            title: _route.title,
        })
    }

    private setTitleForRoute(route: Route) {
        if (route.title === null) return
        document.title = route.title
    }

    private updateState(state: RouterState) {
        this._state = { ...state }
        this.listeners.forEach((listener) => listener(state))
    }
}

export const withRouter = (() => {
    const router = new Router()
    return <T extends (router: Router) => any>(callback: T): ReturnType<T> => callback(router)
})()
