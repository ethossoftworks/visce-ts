import { Interactor } from "@ethossoftworks/interactor"
import { arrayOfNotNull } from "lib/util"
import { UserError, UserService } from "service/user/UserService"

export type LoginState = {
    email: string
    password: string
    shouldShowFormValidation: boolean
    validationErrors: LoginFormValidationError[]
    error: UserError | null
}

function newLoginState(): LoginState {
    return {
        email: "",
        password: "",
        shouldShowFormValidation: false,
        validationErrors: [],
        error: null,
    }
}

export enum LoginFormValidationError {
    Email,
    Password,
}

export class LoginInteractor extends Interactor<LoginState> {
    constructor(private userService: UserService) {
        super(newLoginState())
    }

    errorChanged = (error: UserError | null) =>
        this.update((state) => ({
            ...state,
            error: error,
        }))

    emailChanged = (email: string) =>
        this.update((state) => ({
            ...state,
            email: email,
            validationErrors: this.validateForm(email, state.password),
        }))

    passwordChanged = (password: string) =>
        this.update((state) => ({
            ...state,
            password: password,
            validationErrors: this.validateForm(state.email, password),
        }))

    loginButtonClicked = () =>
        this.update((state) => ({
            ...state,
            shouldShowFormValidation: true,
            validationErrors: this.validateForm(state.email, state.password),
        }))

    private validateForm = (email: string, password: string) =>
        arrayOfNotNull([
            this.userService.isEmailValid(email) ? null : LoginFormValidationError.Email,
            this.userService.isPasswordValid(password) ? null : LoginFormValidationError.Password,
        ])
}
