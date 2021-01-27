import React from "react"
import { createRouteForData, RouteItemData } from "../route"
import { withRouter } from "../router"

export type LinkProps = {
    to: RouteItemData | string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>

export const Link = withRouter((router) => ({ to, children, ...rest }: LinkProps): JSX.Element => {
    const href = typeof to === "string" ? to : createRouteForData(router.origin, router.routes, to).url

    const handleClick = (ev: React.MouseEvent) => {
        ev.preventDefault()
        router.navigate(to)
    }

    return (
        <a {...rest} href={href} onClick={rest.onClick || handleClick}>
            {children}
        </a>
    )
})
