import { UserInteractor } from "interactor/user/UserInteractor"
import { DefaultUserService } from "service/user/DefaultUserService"
import { UserService } from "service/user/UserService"

export class DI {
    static userService: UserService = new DefaultUserService()

    static userInteractor() {
        return new UserInteractor(DI.userService)
    }
}
