import React from "react"
import { LoginBloc, LoginFormValidationError, LoginState } from "ui/login/state/LoginBloc"
import { LoginStatus, UserBloc, UserState } from "state/user/UserBloc"
import { DI } from "../../DI"
import { useRouter } from "lib/router/hooks"
import { Routes } from "ui/routes"
import { LoginForm } from "ui/login/ui/LoginForm"
import { Router } from "lib/router"
import { Modal } from "ui/common/Modal"
import { UserError } from "service/user/UserService"
import { Loader } from "ui/common/Loader"
import { BlocViewModel } from "@ethossoftworks/bloc"
import { useBlocViewModel } from "@ethossoftworks/bloc-react"

export function LoginScreen() {
    const [state, viewModel] = useBlocViewModel(() => new LoginScreenViewModel(DI.loginBloc, DI.userBloc, useRouter()))

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

class LoginScreenViewModel extends BlocViewModel<[LoginState, UserState], LoginViewModelState> {
    constructor(private loginBloc: LoginBloc, private userBloc: UserBloc, private router: Router) {
        super([loginBloc, userBloc])
    }

    transform: (state: [LoginState, UserState]) => LoginViewModelState = ([loginState, userState]) => ({
        ...loginState,
        isLoading: userState.loginStatus == LoginStatus.BUSY,
    })

    onEmailChanged = (value: string) => this.loginBloc.emailChanged(value)

    onPasswordChanged = (value: string) => this.loginBloc.passwordChanged(value)

    onSubmit = async () => {
        this.loginBloc.loginButtonClicked()
        if (this.loginBloc.state.validationErrors.length > 0) return

        const userOutcome = await this.userBloc.login(this.loginBloc.state.email, this.loginBloc.state.password)
        if (userOutcome.isOk()) {
            this.router.navigate(Routes.Home())
        } else if (userOutcome.error === UserError.InvalidPassword) {
            this.loginBloc.errorChanged(userOutcome.error)
        }
    }

    onErrorDismissed = () => this.loginBloc.errorChanged(null)
}
