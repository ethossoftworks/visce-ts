import { route } from "lib/router/route"

const defaultTitle = "Example"

export const Routes = {
    Home: route({
        path: "/",
        title: () => defaultTitle,
    }),
    Login: route({
        path: "/login",
        title: () => defaultTitle,
    }),
}
