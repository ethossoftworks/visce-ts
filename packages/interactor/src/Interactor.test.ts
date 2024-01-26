import { expect, test } from "@ethossoftworks/knock-on-wood"
import { firstValueFrom, skip } from "rxjs"
import { Interactor } from "./Interactor"

export function interactorTests() {
    test("Get current state on subscribe", async () => {
        const interactor = new TestInteractor()
        const result = await firstValueFrom(interactor.stream)
        expect(result.testInt, 0, "State not returned on subscription")
    })

    test("State getter", async () => {
        const interactor = new TestInteractor()
        interactor.increment()
        expect(interactor.state.testInt, 1, `Expected state getter to return 1. Got ${interactor.state.testInt}`)
    })

    test("Subscribe", async () => {
        const interactor = new TestInteractor()
        var eventCount = 0
        const subscription = interactor.stream.subscribe((state) => eventCount++)
        interactor.increment()
        interactor.increment()
        interactor.increment()
        await delay(100)
        subscription.unsubscribe()
        expect(eventCount, 4, `Expected 4 emits and got ${eventCount}`)
    })

    test("Distinct updates", async () => {
        const interactor = new TestInteractor()
        var eventCount = 0
        const subscription = interactor.stream.subscribe((state) => eventCount++)
        interactor.setString("Test")
        interactor.setString("Test")
        interactor.setString("Test 2")
        interactor.setString("Test 2")
        interactor.setString("")
        interactor.setString("")
        await delay(100)
        subscription.unsubscribe()
        expect(eventCount, 3, `Expected 3 emits and got ${eventCount}`)
    })

    test("Persist State On Dispose", async () => {
        const interactor2 = new TestInteractor()
        interactor2.increment()
        interactor2.increment()
        expect(interactor2.state.testInt, 2, "State did not update")
        await firstValueFrom(interactor2.stream)
        expect(interactor2.state.testInt, 2, "State reset on dispose with retainStateOnDispose == true")
    })

    test("Update", async () => {
        const interactor = new TestInteractor()
        const originalState = interactor.state
        expect(interactor.state.testInt, 0, "testInt was not 0")
        interactor.increment()
        interactor.increment()
        interactor.increment()
        interactor.increment()
        expect(interactor.state.testInt, 4, "Update did not update state")
        expect(originalState.testInt, 0, "Update is mutating in place instead of creating an immutable copy")
    })

    test("Computed Value", async () => {
        const interactor = new TestInteractor()
        expect(interactor.state.computedValue, 2, "Computed Value was not set on initial state")
        interactor.increment()
        expect(interactor.state.computedValue, 3, "Computed Value was not updated")
    })

    test("Dependency", async () => {
        const testInteractor = new TestInteractor()
        testInteractor.setString("dependency")
        testInteractor.increment()
        const dependencyInteractor = new TestDependencyInteractor(testInteractor)

        // Test initial computed state without subscription
        expect(
            dependencyInteractor.state.dependentString,
            "dependency",
            "Computed initial dependent state was incorrect"
        )

        // Test updated dependency state on first()
        testInteractor.setString("dependency2")
        expect(
            (await firstValueFrom(dependencyInteractor.stream)).dependentString,
            "dependency2",
            "Dependent state on first() was incorrect after dependent update"
        )

        // Test computed dependency state with subscription
        const subDeferred = firstValueFrom(dependencyInteractor.stream.pipe(skip(1)))
        testInteractor.increment()
        const subValue = await subDeferred
        expect(subValue.dependentInt, 2, "Dependency update did not update parent value")

        // Test Resubscribe
        const subDeferred2 = firstValueFrom(dependencyInteractor.stream.pipe(skip(1)))
        testInteractor.increment()
        const subValue2 = await subDeferred2
        expect(subValue2.dependentInt, 3, "Dependency update did not update parent value after resubscription")

        // Test distinct until changed
        var updateCount = 0
        const sub = dependencyInteractor.stream.pipe(skip(1)).subscribe(() => {
            updateCount++
        })
        testInteractor.setString("distinctTest1")
        delay(16)
        testInteractor.setString("distinctTest2")
        delay(16)
        testInteractor.setString("distinctTest2")
        delay(16)
        testInteractor.setString("distinctTest2")
        sub.unsubscribe()
        expect(updateCount, 2, "Dependency emitted update with equal value")
    })
}

type TestState = {
    testString: string
    testInt: number
    computedValue: number
}

function newTestState(): TestState {
    return { testInt: 0, testString: "Test", computedValue: 0 }
}

class TestInteractor extends Interactor<TestState> {
    constructor() {
        super({
            initialState: newTestState(),
            dependencies: [],
        })
    }

    override computed(state: TestState): Partial<TestState> {
        return {
            computedValue: state.testInt + 2,
        }
    }

    increment = () => this.update({ testInt: this.state.testInt + 1 })
    decrement = () => this.update({ testInt: this.state.testInt - 1 })

    setString = (value: string) => this.update({ testString: value })
}

type TestDependencyState = {
    count: number
    dependentString: string
    dependentInt: number
}

class TestDependencyInteractor extends Interactor<TestDependencyState, [TestInteractor]> {
    constructor(testInteractor: TestInteractor) {
        super({
            initialState: { count: 0, dependentString: "", dependentInt: 0 },
            dependencies: [testInteractor],
        })
    }

    protected override computed(state: TestDependencyState, [testInteractor]: [TestInteractor]) {
        return {
            ...state,
            dependentString: testInteractor.state.testString,
            dependentInt: testInteractor.state.testInt,
        }
    }

    set(value: number) {
        this.update({ count: value })
    }
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
