import React from "react"
import { Route, RouteItem, isRouteMatch } from "../route"
import { useRoute } from "../hooks"

export type RouteProps = {
    children?: React.ReactNode
    matches: RouteItem | RouteItem[]
    route?: Route
}

export function Route({ children, matches, route: routeProp }: RouteProps): JSX.Element | null {
    const currentRoute = useRoute()
    const route = routeProp ? routeProp : currentRoute
    return isRouteMatch(route.item, matches) ? <>{children}</> : null
}
