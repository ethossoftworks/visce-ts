import { UserBloc } from "state/user/UserBloc"
import { DefaultUserService } from "service/user/DefaultUserService"
import { UserService } from "service/user/UserService"
import { LoginBloc } from "ui/login/state/LoginBloc"

export class DI {
    static userService: UserService = new DefaultUserService()

    static loginBloc: LoginBloc = new LoginBloc(DI.userService)
    static userBloc: UserBloc = new UserBloc(DI.userService)
}
