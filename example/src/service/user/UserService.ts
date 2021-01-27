import { Outcome } from "@ethossoftworks/outcome"
import { User } from "model/user/User"

export enum UserError {
    InvalidPassword,
}

export interface UserService {
    currentSession(): Promise<Outcome<User>>
    login(email: string, password: string): Promise<Outcome<User>>
    logout(): Promise<Outcome<void>>

    isEmailValid(email: string): boolean
    isPasswordValid(email: string): boolean
}
