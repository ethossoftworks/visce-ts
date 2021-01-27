import React, { ReactElement } from "react"
import { useRoute } from "../hooks"
import { Uninitialized, isRouteMatch, Route } from "../route"

export type RouteSwitchProps = {
    children?: React.ReactNode
    route?: Route
}

export function RouteSwitch({ children, route: routeProp }: RouteSwitchProps): JSX.Element | null {
    const currentRoute = useRoute()
    const route = routeProp ? routeProp : currentRoute

    if (route.item === Uninitialized) {
        return null
    }

    let match: ReactElement | null = null

    React.Children.forEach(children, (child) => {
        if (match !== null || !React.isValidElement(child)) {
            return
        } else if (child.props.matches === undefined) {
            return
        } else if (!isRouteMatch(route.item, child.props.matches)) {
            return
        }
        match = child
    })

    return match ? React.cloneElement(match, { route }) : null
}
