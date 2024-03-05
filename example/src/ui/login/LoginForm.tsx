import React from "react"

export type LoginFormOptions = {
    onEmailChanged: (value: string) => void
    onPasswordChanged: (value: string) => void
    onSubmit: () => void
    isEmailValid: boolean
    isPasswordValid: boolean
}

export function LoginForm({
    onEmailChanged,
    onPasswordChanged,
    onSubmit,
    isEmailValid,
    isPasswordValid,
}: LoginFormOptions) {
    return (
        <form
            className="login-form"
            onSubmit={(ev) => {
                ev.preventDefault()
                onSubmit()
            }}
        >
            <div>
                <div>Email</div>
                <input name="email" type="email" onChange={(el) => onEmailChanged(el.target.value)} />
                {!isEmailValid ? <div>Email is not valid</div> : null}
            </div>
            <br />
            <div>
                <div>Password</div>
                <input name="password" type="password" onChange={(el) => onPasswordChanged(el.target.value)} />
                {!isPasswordValid ? <div>Password is not valid</div> : null}
            </div>
            <br />
            <button>Login</button>
        </form>
    )
}
