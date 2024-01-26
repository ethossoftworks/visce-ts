import { DefaultUserService } from "service/user/DefaultUserService"
import { UserService } from "service/user/UserService"
import { UserInteractor } from "state/user/UserInteractor"
import { LoginInteractor } from "ui/login/state/LoginInteractor"

export class DI {
    static userService: UserService = new DefaultUserService()

    static loginInteractor: LoginInteractor = new LoginInteractor(DI.userService)
    static userInteractor: UserInteractor = new UserInteractor(DI.userService)
}
