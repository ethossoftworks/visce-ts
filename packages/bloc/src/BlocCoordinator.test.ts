import { assert, test } from "@ethossoftworks/knock-on-wood"
import { Bloc } from "./Bloc"
import { BlocCoordinator } from "./BlocCoordinator"

export function blocCoordinatorTests() {
    test("Coordinator Initial Value", () => {
        const c = new TestCoordinator(new TestBloc1(), new TestBloc2())
        assert(c.state.one === 0 && c.state.two === "", "Initial state was wrong")
    })

    test("Coordinator Updated Value", () => {
        const c = new TestCoordinator(new TestBloc1(), new TestBloc2())

        c.increment()
        c.increment()
        c.increment()
        c.increment()

        assert(c.state.one === 4, "Updated state was wrong")
    })

    test("Coordinator Subscription", async () => {
        const c = new TestCoordinator(new TestBloc1(), new TestBloc2())
        var events = 0
        const sub = c.stream.subscribe((event) => events++)

        c.increment()
        c.increment()
        c.increment()
        c.increment()

        await delay(16)
        assert(events === 5, "Subscription didn't receive 5 events")
        sub.unsubscribe()
    })

    test("Coordinator Subscription Distinct", async () => {
        const c = new TestCoordinator(new TestBloc1(), new TestBloc2())
        var events = 0
        const sub = c.stream.subscribe((event) => events++)

        c.setValue("one")
        c.setValue("two")
        c.setValue("two")
        c.setValue("two")
        c.setValue("three")

        await delay(16)
        assert(events === 4, "Distinct did not work")
        sub.unsubscribe()
    })

    test("Coordinator Unsubscription Dispose", async () => {
        const c = new TestCoordinator(new TestBloc1(), new TestBloc2())
        const sub = c.stream.subscribe((event) => {})
        const sub2 = c.stream.subscribe((event) => {})

        c.increment()
        c.increment()
        c.increment()
        c.increment()

        sub.unsubscribe()
        assert(c.state.one === 4, "Bloc disposed before all subscriptions were done")
        sub2.unsubscribe()
        assert(c.state.one === 0, "Bloc did not reset on dispose from coordinator")
    })
}

type TestState = {
    one: number
}

type TestState2 = {
    two: string
}

type TestCombinedState = {
    one: number
    two: string
}

class TestBloc1 extends Bloc<TestState> {
    constructor() {
        super({ one: 0 }, { retainStateOnDispose: false, dependencies: [] })
    }

    increment = () => this.update({ one: this.state.one + 1 })
}

class TestBloc2 extends Bloc<TestState2> {
    constructor() {
        super({ two: "" }, { retainStateOnDispose: false, dependencies: [] })
    }

    setValue = (value: string) => this.update({ two: value })
}

class TestCoordinator extends BlocCoordinator<[TestState, TestState2], TestCombinedState> {
    constructor(private bloc1: TestBloc1, private bloc2: TestBloc2) {
        super([bloc1, bloc2])
    }

    override transform = ([s1, s2]: [TestState, TestState2]) => ({ one: s1.one, two: s2.two })

    increment = () => this.bloc1.increment()
    setValue = (value: string) => this.bloc2.setValue(value)
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
