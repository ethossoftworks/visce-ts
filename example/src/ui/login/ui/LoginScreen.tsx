import React from "react"
import { LoginInteractor, LoginFormValidationError, LoginState } from "ui/login/state/LoginInteractor"
import { LoginStatus, UserInteractor, UserState } from "state/user/UserInteractor"
import { DI } from "../../DI"
import { useRouter } from "lib/router/hooks"
import { Routes } from "ui/routes"
import { LoginForm } from "ui/login/ui/LoginForm"
import { Router } from "lib/router"
import { Modal } from "ui/common/Modal"
import { UserError } from "service/user/UserService"
import { Loader } from "ui/common/Loader"
import { Interactor } from "@ethossoftworks/visce"
import { useInteractor } from "@ethossoftworks/visce-react"

export function LoginScreen() {
    const [state, interactor] = useInteractor(
        () => new LoginScreenViewInteractor(DI.loginInteractor(), DI.userInteractor(), useRouter())
    )

    return (
        <div className="page-wrapper">
            <LoginForm
                isEmailValid={
                    !state.shouldShowFormValidation || !state.validationErrors.includes(LoginFormValidationError.Email)
                }
                isPasswordValid={
                    !state.shouldShowFormValidation ||
                    !state.validationErrors.includes(LoginFormValidationError.Password)
                }
                onEmailChanged={interactor.onEmailChanged}
                onPasswordChanged={interactor.onPasswordChanged}
                onSubmit={interactor.onSubmit}
            />
            <Loader isVisible={state.isLoading} />
            <Modal
                isVisible={state.error == UserError.InvalidPassword}
                title="Invalid Password"
                message="Please use the password 'password123'"
                buttons={[
                    {
                        label: "Ok",
                        onClick: () => interactor.onErrorDismissed(),
                    },
                ]}
            />
        </div>
    )
}

type LoginViewModelState = {
    email: string
    password: string
    shouldShowFormValidation: boolean
    validationErrors: LoginFormValidationError[]
    error: UserError | null
    isLoading: boolean
}

class LoginScreenViewInteractor extends Interactor<LoginViewModelState> {
    constructor(
        private loginInteractor: LoginInteractor,
        private userInteractor: UserInteractor,
        private router: Router
    ) {
        super({
            initialState: {
                email: "",
                password: "",
                shouldShowFormValidation: false,
                validationErrors: [],
                error: null,
                isLoading: false,
            },
            dependencies: [loginInteractor, userInteractor],
        })
    }

    protected computed(state: LoginViewModelState): Partial<LoginViewModelState> {
        return {
            ...state,
            ...this.loginInteractor.state,
            isLoading: this.userInteractor.state.loginStatus == LoginStatus.BUSY,
        }
    }

    onEmailChanged = (value: string) => this.loginInteractor.emailChanged(value)

    onPasswordChanged = (value: string) => this.loginInteractor.passwordChanged(value)

    onSubmit = async () => {
        this.loginInteractor.loginButtonClicked()
        if (this.loginInteractor.state.validationErrors.length > 0) return

        const userOutcome = await this.userInteractor.login(
            this.loginInteractor.state.email,
            this.loginInteractor.state.password
        )
        if (userOutcome.isOk()) {
            this.router.navigate(Routes.Home())
        } else if (userOutcome.error === UserError.InvalidPassword) {
            this.loginInteractor.errorChanged(userOutcome.error)
        }
    }

    onErrorDismissed = () => this.loginInteractor.errorChanged(null)
}
