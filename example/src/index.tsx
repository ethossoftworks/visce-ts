import ReactDOM from "react-dom"
import React from "react"

import { App } from "ui/app/App"
import "static/main.scss"
import { withRouter } from "lib/router/router"
import { Routes } from "ui/routes"

withRouter((router) => router.init(Routes))
ReactDOM.render(<App />, document.getElementById("root"))
