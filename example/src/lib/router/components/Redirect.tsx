import { useEffect } from "react"
import { RouteItemData } from "../route"
import { withRouter } from "../router"

export type RedirectProps = {
    to: RouteItemData | string
    condition?: boolean
    replace?: boolean
}

export const Redirect = withRouter(
    (router) => ({ to, condition, replace = true }: RedirectProps): JSX.Element | null => {
        useEffect(() => {
            if (condition !== undefined && condition === false) {
                return
            }
            router.navigate(to, replace)
        }, [condition])

        return null
    }
)
