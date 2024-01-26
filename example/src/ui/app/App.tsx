import React, { useEffect } from "react"
import { PageNotFound } from "lib/router"
import { RouteSwitch, Route, Link, useRoute } from "lib/router/components"
import { CSSTransition, TransitionGroup } from "react-transition-group"
import { Routes } from "../routes"
import { HomeScreen } from "ui/home/HomeScreen"
import { LoginScreen } from "ui/login/ui/LoginScreen"
import { AuthRoute } from "ui/common/AuthRoute"
import { DI } from "../DI"
import { useInteractor } from "@ethossoftworks/interactor-react"

export function App() {
    const route = useRoute()
    const [userState, userInteractor] = useInteractor(DI.userInteractor)

    useEffect(() => {
        userInteractor.initialize()
    }, [])

    if (!userState.isInitialized) return <div>Loading...</div>

    return (
        <TransitionGroup className="page-cont">
            <CSSTransition classNames="page-wrapper" timeout={250} appear={true} key={route.key}>
                <RouteSwitch route={route}>
                    <AuthRoute matches={Routes.Home} isLoggedIn={userState.user !== null}>
                        <HomeScreen />
                    </AuthRoute>
                    <Route matches={Routes.Login}>
                        <LoginScreen />
                    </Route>
                    <Route matches={PageNotFound}>
                        <div className="page-wrapper">
                            <div>Page Not Found</div>
                            <Link to={Routes.Home()}>Home</Link>
                        </div>
                    </Route>
                </RouteSwitch>
            </CSSTransition>
        </TransitionGroup>
    )
}
