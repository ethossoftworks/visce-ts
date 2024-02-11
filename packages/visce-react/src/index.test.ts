import { runTests } from "@ethossoftworks/knock-on-wood"
import { hookTests } from "./hooks.test"

runTests({ "Interactor React": hookTests })
