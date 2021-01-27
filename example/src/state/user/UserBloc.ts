import { User } from "model/user/User"
import { UserService } from "service/user/UserService"
import { Bloc } from "@ethossoftworks/bloc"

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

export class UserBloc extends Bloc<UserState> {
    constructor(private userService: UserService) {
        super({ user: null, isInitialized: false, loginStatus: LoginStatus.IDLE }, true)
    }

    static Effects = {
        Login: "login",
        Logout: "logout",
        Initialize: "initialize",
    }

    initialize = () =>
        this.effect({
            id: UserBloc.Effects.Initialize,
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

    login = (email: string, password: string) =>
        this.effect({
            id: UserBloc.Effects.Login,
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
            id: UserBloc.Effects.Logout,
            block: async (job) => {
                const outcome = await job.pause(this.userService.logout())
                if (outcome.isOk()) this.update((state) => ({ ...state, user: null }))
                return outcome
            },
        })
}
