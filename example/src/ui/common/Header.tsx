import React from "react"
import { DI } from "../DI"
import { InteractorViewModel } from "@ethossoftworks/interactor"
import { useInteractorViewModel } from "@ethossoftworks/interactor-react"
import { UserInteractor, UserState } from "state/user/UserInteractor"

export function Header() {
    const [state, viewModel] = useInteractorViewModel(() => new HeaderViewModel(DI.userInteractor))

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

class HeaderViewModel extends InteractorViewModel<[UserState], HeaderViewModelState> {
    constructor(private userInteractor: UserInteractor) {
        super([userInteractor])
    }

    transform = ([userState]: [UserState]) => ({ userName: userState.user?.email ?? "" })

    logout = () => this.userInteractor.logout()
}
