import { Interactor } from "@ethossoftworks/visce"
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
        super({
            initialState: { user: null, isInitialized: false, loginStatus: LoginStatus.IDLE },
            dependencies: [],
        })
    }

    async initialize() {
        this.interactorScope.launchAndRun(async (job) => {
            const sessionOutcome = await job.pause(this.userService.currentSession())
            this.update({
                ...(sessionOutcome.isOk() ? { user: sessionOutcome.value } : {}),
                isInitialized: true,
            })

            return sessionOutcome
        })
    }

    async login(email: string, password: string) {
        return this.interactorScope.launchAndRun(async (job) => {
            this.update({ loginStatus: LoginStatus.BUSY })
            const userOutcome = await job.pause(this.userService.login(email, password))

            this.update({
                loginStatus: LoginStatus.IDLE,
                user: userOutcome.isOk() ? userOutcome.value : this.state.user,
            })

            return userOutcome
        })
    }

    async logout() {
        this.interactorScope.launchAndRun(async (job) => {
            const outcome = await job.pause(this.userService.logout())
            if (outcome.isOk()) this.update({ user: null })
            return outcome
        })
    }
}
