import { Outcome } from "@ethossoftworks/outcome"
import { delay } from "lib/util"
import { User } from "model/user/User"
import { UserError, UserService } from "./UserService"

export class DefaultUserService implements UserService {
    async login(email: string, password: string): Promise<Outcome<User, unknown>> {
        await delay(1000)
        if (password === "password123") {
            localStorage.setItem("user", JSON.stringify({ email: email, name: email }))
            return Outcome.ok({ email: email, name: email })
        } else {
            return Outcome.error(UserError.InvalidPassword)
        }
    }

    async logout(): Promise<Outcome<void, unknown>> {
        await delay(1000)
        localStorage.removeItem("user")
        return Outcome.ok(undefined)
    }

    async currentSession(): Promise<Outcome<User>> {
        const session = localStorage.getItem("user")
        if (session === null) return Outcome.error(null)

        return Outcome.ok(JSON.parse(session) as User)
    }

    isEmailValid = (email: string) => email.indexOf(".") !== -1 && email.indexOf("@") !== -1
    isPasswordValid = (password: string) => password.length > 8
}
