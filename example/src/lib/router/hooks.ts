import { useLayoutEffect, useState } from "react"
import { Route, isRouteMatch, RouteItem } from "./route"
import { createRouteForRouterState, withRouter } from "./router"

export const useRouter = withRouter((router) => () => router)

export const useRoute = withRouter((router) => (): Route => {
    const route = createRouteForRouterState(router.state)
    const [_, setRoute] = useState({ key: route.key, url: route.url })

    useLayoutEffect(() => {
        const dispose = router.listen((state) => {
            const updatedRoute = createRouteForRouterState(state)
            setRoute({ key: updatedRoute.key, url: updatedRoute.url })
        })
        return () => dispose()
    }, [])

    return route
})

export function useRouteMatch(matches: RouteItem | RouteItem[]): Route | null {
    const route = useRoute()
    return isRouteMatch(route.item, matches) ? route : null
}

export function useRouteParams(): Record<string, string> {
    return useRoute().data.params
}

export function useRouteQuery(): Record<string, string> {
    return useRoute().data.query
}

export function useRouteHash(): string {
    return useRoute().data.hash
}
