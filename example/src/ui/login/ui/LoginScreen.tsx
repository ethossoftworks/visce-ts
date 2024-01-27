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
import { InteractorViewModel } from "@ethossoftworks/interactor"
import { useInteractorViewModel } from "@ethossoftworks/interactor-react"

export function LoginScreen() {
    const [state, viewModel] = useInteractorViewModel(
        () => new LoginScreenViewModel(DI.loginInteractor, DI.userInteractor, useRouter()),
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
                onEmailChanged={viewModel.onEmailChanged}
                onPasswordChanged={viewModel.onPasswordChanged}
                onSubmit={viewModel.onSubmit}
            />
            <Loader isVisible={state.isLoading} />
            <Modal
                isVisible={state.error == UserError.InvalidPassword}
                title="Invalid Password"
                message="Please use the password 'password123'"
                buttons={[
                    {
                        label: "Ok",
                        onClick: () => viewModel.onErrorDismissed(),
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

class LoginScreenViewModel extends InteractorViewModel<[LoginState, UserState], LoginViewModelState> {
    constructor(
        private loginInteractor: LoginInteractor,
        private userInteractor: UserInteractor,
        private router: Router,
    ) {
        super([loginInteractor, userInteractor])
    }

    transform: (state: [LoginState, UserState]) => LoginViewModelState = ([loginState, userState]) => ({
        ...loginState,
        isLoading: userState.loginStatus == LoginStatus.BUSY,
    })

    onEmailChanged = (value: string) => this.loginInteractor.emailChanged(value)

    onPasswordChanged = (value: string) => this.loginInteractor.passwordChanged(value)

    onSubmit = async () => {
        this.loginInteractor.loginButtonClicked()
        if (this.loginInteractor.state.validationErrors.length > 0) return

        const userOutcome = await this.userInteractor.login(
            this.loginInteractor.state.email,
            this.loginInteractor.state.password,
        )
        if (userOutcome.isOk()) {
            this.router.navigate(Routes.Home())
        } else if (userOutcome.error === UserError.InvalidPassword) {
            this.loginInteractor.errorChanged(userOutcome.error)
        }
    }

    onErrorDismissed = () => this.loginInteractor.errorChanged(null)
}
