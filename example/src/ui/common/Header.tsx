import React from "react"
import { DI } from "../DI"
import { BlocViewModel } from "@ethossoftworks/bloc"
import { useBlocViewModel } from "@ethossoftworks/bloc-react"
import { UserBloc, UserState } from "state/user/UserBloc"

export function Header() {
    const [state, viewModel] = useBlocViewModel(() => new HeaderViewModel(DI.userBloc))

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

class HeaderViewModel extends BlocViewModel<[UserState], HeaderViewModelState> {
    constructor(private userBloc: UserBloc) {
        super([userBloc])
    }

    transform = ([userState]: [UserState]) => ({ userName: userState.user?.email ?? "" })

    logout = () => this.userBloc.logout()
}
