import { Interactor } from "@ethossoftworks/interactor"
import { User } from "model/user/User"
import { UserService } from "service/user/UserService"

export enum LoginStatus {
    IDLE,
    BUSY,
    ERROR,
}

export type UserState = {
    user: User | null
    isInitialized: boolean
    loginStatus: LoginStatus
}

export class UserInteractor extends Interactor<UserState> {
    constructor(private userService: UserService) {
        super({ user: null, isInitialized: false, loginStatus: LoginStatus.IDLE }, true)
    }

    static Effects = {
        Login: "login",
        Logout: "logout",
        Initialize: "initialize",
    }

    async initialize() {
        this.effect({
            id: UserInteractor.Effects.Initialize,
            block: async (job) => {
                const sessionOutcome = await job.pause(this.userService.currentSession())
                this.update((state) => ({
                    ...state,
                    ...(sessionOutcome.isOk() ? { user: sessionOutcome.value } : {}),
                    isInitialized: true,
                }))

                return sessionOutcome
            },
        })
    }

    login = (email: string, password: string) =>
        this.effect({
            id: UserInteractor.Effects.Login,
            block: async (job) => {
                this.update((state) => ({ ...state, loginStatus: LoginStatus.BUSY }))
                const userOutcome = await job.pause(this.userService.login(email, password))

                this.update((state) => ({
                    ...state,
                    loginStatus: LoginStatus.IDLE,
                    user: userOutcome.isOk() ? userOutcome.value : state.user,
                }))

                return userOutcome
            },
        })

    logout = () =>
        this.effect({
            id: UserInteractor.Effects.Logout,
            block: async (job) => {
                const outcome = await job.pause(this.userService.logout())
                if (outcome.isOk()) this.update((state) => ({ ...state, user: null }))
                return outcome
            },
        })
}
