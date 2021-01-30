import { runTests } from "@ethossoftworks/knock-on-wood"
import { hookTests } from "./hooks.test"

runTests({ "Bloc React": hookTests })
