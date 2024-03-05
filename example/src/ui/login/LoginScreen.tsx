import React from "react"
import { DI } from "../DI"
import { useRouter } from "lib/router/hooks"
import { LoginForm } from "ui/login/LoginForm"
import { Modal } from "ui/common/Modal"
import { UserError } from "service/user/UserService"
import { Loader } from "ui/common/Loader"
import { useInteractor } from "@ethossoftworks/visce-react"
import { LoginFormValidationError, LoginScreenViewInteractor } from "./LoginScreenViewInteractor"

export function LoginScreen() {
    const [state, interactor] = useInteractor(
        () => new LoginScreenViewInteractor(DI.userInteractor(), DI.userService, useRouter())
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
                onSubmit={() => interactor.onLoginButtonClicked()}
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
