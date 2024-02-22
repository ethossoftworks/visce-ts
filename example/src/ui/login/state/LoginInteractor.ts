import { Interactor } from "@ethossoftworks/visce"
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
        super({
            initialState: newLoginState(),
            dependencies: [],
        })
    }

    errorChanged = (error: UserError | null) =>
        this.update({
            error: error,
        })

    emailChanged = (email: string) =>
        this.update({
            email: email,
            validationErrors: this.validateForm(email, this.state.password),
        })

    passwordChanged = (password: string) =>
        this.update({
            password: password,
            validationErrors: this.validateForm(this.state.email, password),
        })

    loginButtonClicked = () =>
        this.update({
            shouldShowFormValidation: true,
            validationErrors: this.validateForm(this.state.email, this.state.password),
        })

    private validateForm = (email: string, password: string) =>
        arrayOfNotNull([
            this.userService.isEmailValid(email) ? null : LoginFormValidationError.Email,
            this.userService.isPasswordValid(password) ? null : LoginFormValidationError.Password,
        ])
}
