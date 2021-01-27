import React from "react"
import { Redirect, Route, RouteProps } from "lib/router/components"
import { Routes } from "../routes"

export function AuthRoute({ children, route, isLoggedIn, ...rest }: RouteProps & { isLoggedIn: boolean }) {
    if (!route) return null
    return <Route {...rest}>{!isLoggedIn ? <Redirect to={Routes.Login()} /> : children}</Route>
}
