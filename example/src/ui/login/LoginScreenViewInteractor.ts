import { Interactor } from "@ethossoftworks/visce"
import { LoginStatus, UserInteractor } from "interactor/user/UserInteractor"
import { Router } from "lib/router"
import { arrayOfNotNull } from "lib/util"
import { UserError, UserService } from "service/user/UserService"
import { Routes } from "ui/routes"

export enum LoginFormValidationError {
    Email,
    Password,
}

type LoginScreenViewState = {
    email: string
    password: string
    shouldShowFormValidation: boolean
    validationErrors: LoginFormValidationError[]
    error: UserError | null
    isLoading: boolean
}

export class LoginScreenViewInteractor extends Interactor<LoginScreenViewState> {
    constructor(private userInteractor: UserInteractor, private userService: UserService, private router: Router) {
        super({
            initialState: {
                email: "",
                password: "",
                shouldShowFormValidation: false,
                validationErrors: [],
                error: null,
                isLoading: false,
            },
            dependencies: [userInteractor],
        })
    }

    protected computed(state: LoginScreenViewState): Partial<LoginScreenViewState> {
        return {
            ...state,
            isLoading: this.userInteractor.state.loginStatus == LoginStatus.BUSY,
        }
    }

    errorChanged = (error: UserError | null) =>
        this.update({
            error: error,
        })

    onEmailChanged = (email: string) =>
        this.update({
            email: email,
            validationErrors: this.validateForm(email, this.state.password),
        })

    onPasswordChanged = (password: string) =>
        this.update({
            password: password,
            validationErrors: this.validateForm(this.state.email, password),
        })

    async onLoginButtonClicked() {
        this.update({
            shouldShowFormValidation: true,
            validationErrors: this.validateForm(this.state.email, this.state.password),
        })

        if (this.state.validationErrors.length > 0) return

        const userOutcome = await this.userInteractor.login(this.state.email, this.state.password)
        if (userOutcome.isOk()) {
            this.router.navigate(Routes.Home())
        } else if (userOutcome.error === UserError.InvalidPassword) {
            this.errorChanged(userOutcome.error)
        }
    }

    private validateForm = (email: string, password: string) =>
        arrayOfNotNull([
            this.userService.isEmailValid(email) ? null : LoginFormValidationError.Email,
            this.userService.isPasswordValid(password) ? null : LoginFormValidationError.Password,
        ])

    onErrorDismissed = () => this.errorChanged(null)
}
