import { runTests } from "@ethossoftworks/knock-on-wood"
import { interactorTests } from "./Interactor.test"

runTests({ Interactor: interactorTests })
