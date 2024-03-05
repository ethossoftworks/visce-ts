import React from "react"
import { DI } from "../DI"
import { UserInteractor } from "interactor/user/UserInteractor"
import { useInteractor } from "@ethossoftworks/visce-react"
import { Interactor } from "@ethossoftworks/visce"

export function Header() {
    const [state, viewModel] = useInteractor(() => new HeaderViewInteractor(DI.userInteractor()))

    return (
        <div className="header">
            <div>Weather</div>
            <div>{state.userName}</div>
            <button onClick={() => viewModel.logout()}>Logout</button>
        </div>
    )
}

type HeaderViewModelState = {
    userName: string
}

class HeaderViewInteractor extends Interactor<HeaderViewModelState> {
    constructor(private userInteractor: UserInteractor) {
        super({
            initialState: { userName: "" },
            dependencies: [userInteractor],
        })
    }

    protected computed(state: HeaderViewModelState): Partial<HeaderViewModelState> {
        return {
            ...state,
            userName: this.userInteractor.state.user?.email ?? "",
        }
    }

    logout = () => this.userInteractor.logout()
}
