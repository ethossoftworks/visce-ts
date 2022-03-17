import { Job, JobCancellationException } from "@ethossoftworks/job"
import { expect, fail, test } from "@ethossoftworks/knock-on-wood"
import { Outcome } from "@ethossoftworks/outcome"
import { firstValueFrom, skip } from "rxjs"
import { Bloc, BlocStatus, EffectStatus } from "./Bloc"

export function blocTests() {
    test("Get current state on subscribe", async () => {
        const bloc = new TestBloc()
        const result = await firstValueFrom(bloc.stream)
        expect(result.testInt, 0, "State not returned on subscription")
    })

    test("State getter", async () => {
        const bloc = new TestBloc()
        bloc.increment()
        expect(bloc.state.testInt, 1, `Expected state getter to return 1. Got ${bloc.state.testInt}`)
    })

    test("Subscribe", async () => {
        const bloc = new TestBloc()
        var eventCount = 0
        const subscription = bloc.stream.subscribe((state) => eventCount++)
        bloc.increment()
        bloc.increment()
        bloc.increment()
        await delay(100)
        subscription.unsubscribe()
        expect(eventCount, 4, `Expected 4 emits and got ${eventCount}`)
    })

    test("Distinct updates", async () => {
        const bloc = new TestBloc()
        var eventCount = 0
        const subscription = bloc.stream.subscribe((state) => eventCount++)
        bloc.setString("Test")
        bloc.setString("Test")
        bloc.setString("Test 2")
        bloc.setString("Test 2")
        bloc.setString("")
        bloc.setString("")
        await delay(100)
        subscription.unsubscribe()
        expect(eventCount, 3, `Expected 3 emits and got ${eventCount}`)
    })

    test("On Start", async () => {
        var onStartedCount = 0
        const bloc = new TestBloc({ onStartCallback: () => onStartedCount++ })
        expect(onStartedCount, 0, "On Started was called before subscription")
        await firstValueFrom(bloc.stream)
        expect(onStartedCount, 1, "On Started was not called")
        await firstValueFrom(bloc.stream)
        expect(onStartedCount, 2, "On Started was not called after dispose")
    })

    test("On Dispose", async () => {
        var onDisposedCount = 0
        const bloc = new TestBloc({ onDisposeCallback: () => onDisposedCount++ })
        expect(onDisposedCount, 0, "onDispose was called before subscription")
        const subscription1 = bloc.stream.subscribe((event) => {})
        const subscription2 = bloc.stream.subscribe((event) => {})
        expect(onDisposedCount, 0, "onDispose was called before subscription was cancelled")
        subscription1.unsubscribe()
        expect(onDisposedCount, 0, "onDispose was called with an active subscription")
        subscription2.unsubscribe()
        expect(onDisposedCount, 1, "onDispose was not called")
        await firstValueFrom(bloc.stream)
        expect(onDisposedCount, 2, "onDispose was not called after restart")
    })

    test("Persist State On Dispose", async () => {
        const bloc = new TestBloc({ retainStateOnDispose: false })
        bloc.increment()
        bloc.increment()
        expect(bloc.state.testInt, 2, "State did not update")
        await firstValueFrom(bloc.stream)
        expect(bloc.state.testInt, 0, "State did not reset on dispose with retainStateOnDispose == false")

        const bloc2 = new TestBloc({ retainStateOnDispose: true })
        bloc2.increment()
        bloc2.increment()
        expect(bloc2.state.testInt, 2, "State did not update")
        await firstValueFrom(bloc2.stream)
        expect(bloc2.state.testInt, 2, "State reset on dispose with retainStateOnDispose == true")
    })

    test("BlocScope", async () => {
        const bloc = new TestBloc()
        var jobCompleted = false

        const jobFuture = bloc.blocScope.launchAndRun(async (job) => {
            await job.delay(1000)
            jobCompleted = true
            return Outcome.ok(null)
        })

        await firstValueFrom(bloc.stream)
        const jobResult = await jobFuture
        if (!jobResult.isError() || !(jobResult.error instanceof JobCancellationException))
            fail("Bloc scope was not cancelled on dispose")
        if (jobCompleted) fail("Job completed")
    })

    test("Update", async () => {
        const bloc = new TestBloc()
        const originalState = bloc.state
        expect(bloc.state.testInt, 0, "testInt was not 0")
        bloc.increment()
        bloc.increment()
        bloc.increment()
        bloc.increment()
        expect(bloc.state.testInt, 4, "Update did not update state")
        expect(originalState.testInt, 0, "Update is mutating in place instead of creating an immutable copy")
    })

    test("Effect", async () => {
        const bloc = new TestBloc()
        const start = Date.now()
        const result = await bloc.testEffect()
        if (!result.isOk() || result.value.testInt != 1) fail("Effect did not return result")
        if (Date.now() - start < 500) fail("Effect did not wait 1000 milliseconds")
        if (bloc.state.testInt != 1) fail("Effect did not update state")
    })

    test("Effect Cancel", async () => {
        const bloc = new TestBloc()

        // Cancellation on effect restart. Delays are important between calls to mimic human interaction and to
        // make sure race condition between starting and finishing an effect is checked
        bloc.testEffect()
        await delay(100)
        bloc.testEffect()
        await delay(100)
        bloc.testEffect()
        await delay(100)
        bloc.testEffect()
        await delay(100)
        bloc.testEffect()
        await delay(100)
        bloc.testEffect()
        await delay(100)
        await bloc.testEffect()
        await delay(600)
        if (bloc.state.testInt !== 1)
            fail(`Effects were not cancelled on new effect launch. State was incremented to ${bloc.state.testInt}.`)

        // Explicit cancellation
        setTimeout(() => bloc.cancelTestEffect(), 16)
        const result = await bloc.testEffect()
        if (!result.isError() || !(result.error instanceof JobCancellationException))
            fail("Effect did not cancel when explicitly cancelled")
    })

    test("Effect OnCancel", async () => {
        const bloc = new TestBloc()
        await bloc.testEffect2()
        await bloc.testEffect2()
        await bloc.testEffect2()
        expect(bloc.state.testInt, 3, `TestEffect2 not updating state properly. State: ${bloc.state.testInt}.`)

        setTimeout(() => bloc.cancelTestEffect2(), 16)
        await bloc.testEffect2()
        await delay(100)
        if (bloc.state.testInt != 0) fail(`TestEffect2 onCancel did not work properly. State: ${bloc.state.testInt}.`)
    })

    test("Effect OnDone", async () => {
        const bloc = new TestBloc()
        bloc.testEffect3()
        await new Promise(async (resolve) => {
            await delay(16)
            bloc.cancelTestEffect3()
            resolve(undefined)
        })
        await bloc.testEffect3()
        expect(bloc.state.testInt, -3, `State: ${bloc.state.testInt}`)
    })

    test("Effect cancelOnDispose", async () => {
        // cancelOnDispose === true
        const bloc = new TestBloc()
        const subscription = bloc.stream.subscribe((state) => {})
        const effectPromise = bloc.testEffect()
        subscription.unsubscribe()
        const effectResult = await effectPromise
        expect(bloc.state.testInt, 0, "State should have been 0 due to dispose")
        if (!effectResult.isError() || !(effectResult.error instanceof JobCancellationException))
            fail("Effect was not cancelled")

        // cancelOnDispose === false
        const subscription2 = bloc.stream.subscribe((state) => {})
        const effectPromise2 = bloc.noCancelOnDisposeEffect()
        subscription2.unsubscribe()
        const effectResult2 = await effectPromise2
        expect(bloc.state.testInt, 1, "State should have been 1 due to cancelOnDispose == false")
        if (!effectResult2.isOk() || effectResult2.value.testInt !== 1) fail("Effect was cancelled")
    })

    test("Bloc Status", async () => {
        const bloc = new TestBloc()
        expect(bloc.status, BlocStatus.Idle, "Bloc status was not Idle")
        const sub = bloc.stream.subscribe(() => {})
        expect(bloc.status, BlocStatus.Started, "Bloc status was not Started")
        sub.unsubscribe()
        expect(bloc.status, BlocStatus.Idle, "Bloc status was not Idle after unsubscribe")
    })

    test("Computed Value", async () => {
        const bloc = new TestBloc()
        expect(bloc.state.computedValue, 2, "Computed Value was not set on initial state")
        bloc.increment()
        expect(bloc.state.computedValue, 3, "Computed Value was not updated")
        const sub = bloc.stream.subscribe(() => {})
        sub.unsubscribe()
        expect(bloc.state.computedValue, 2, "Computed Value was not reset on dispose")
    })

    test("Effect Status", async () => {
        const bloc = new TestBloc()
        const effect = bloc.testEffect()
        expect(bloc.effectStatus(bloc.testEffect), EffectStatus.Running)
        expect(bloc.effectStatus("nothing"), EffectStatus.Idle)
        await effect
        expect(bloc.effectStatus(bloc.testEffect), EffectStatus.Idle)
    })

    test("Dependency", async () => {
        let testBlocDisposed = false
        const testBloc = new TestBloc({
            retainStateOnDispose: true,
            onDisposeCallback: () => {
                testBlocDisposed = true
            },
        })
        testBloc.setString("dependency")
        testBloc.increment()
        const dependencyBloc = new TestDependencyBloc(testBloc)

        // Test initial computed state without subscription
        expect(dependencyBloc.state.dependentString, "dependency", "Computed initial dependent state was incorrect")

        // Test updated dependency state on first()
        testBloc.setString("dependency2")
        expect(
            (await firstValueFrom(dependencyBloc.stream)).dependentString,
            "dependency2",
            "Dependent state on first() was incorrect after dependent update"
        )

        // Test computed dependency state with subscription
        const subDeferred = firstValueFrom(dependencyBloc.stream.pipe(skip(1)))
        testBloc.increment()
        const subValue = await subDeferred
        expect(subValue.dependentInt, 2, "Dependency update did not update parent value")

        // Test that dependencies are disposed
        delay(16)
        expect(testBlocDisposed, true, "Dependency was not disposed")

        // Test Resubscribe
        const subDeferred2 = firstValueFrom(dependencyBloc.stream.pipe(skip(1)))
        testBloc.increment()
        const subValue2 = await subDeferred2
        expect(subValue2.dependentInt, 3, "Dependency update did not update parent value after resubscription")

        // Test distinct until changed
        var updateCount = 0
        const sub = dependencyBloc.stream.pipe(skip(1)).subscribe(() => {
            updateCount++
        })
        testBloc.setString("distinctTest1")
        delay(16)
        testBloc.setString("distinctTest2")
        delay(16)
        testBloc.setString("distinctTest2")
        delay(16)
        testBloc.setString("distinctTest2")
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

class TestBloc extends Bloc<TestState> {
    private onStartCallback?: () => void
    private onDisposeCallback?: () => void

    private static Effects = {
        Test3: "testEffect3",
        NoCancelOnDispose: "noCancelOnDisposeEffect",
    }

    constructor(options?: {
        retainStateOnDispose?: boolean
        onStartCallback?: () => void
        onDisposeCallback?: () => void
    }) {
        super({
            initialState: newTestState(),
            retainStateOnDispose: options?.retainStateOnDispose ?? false,
            dependencies: [],
        })
        this.onStartCallback = options?.onStartCallback
        this.onDisposeCallback = options?.onDisposeCallback
    }

    override computed(state: TestState): Partial<TestState> {
        return {
            computedValue: state.testInt + 2,
        }
    }

    override onStart() {
        this.onStartCallback?.()
    }

    override onDispose() {
        this.onDisposeCallback?.()
    }

    increment = () => this.update({ testInt: this.state.testInt + 1 })
    decrement = () => this.update({ testInt: this.state.testInt - 1 })

    setString = (value: string) => this.update({ testString: value })

    testEffect = () =>
        this.effect({
            id: this.testEffect,
            block: async (job) => {
                await job.delay(500)
                return Outcome.ok(this.increment())
            },
        })

    testEffect2 = () =>
        this.effect({
            id: this.testEffect2,
            block: async (job) => {
                await job.delay(500)
                return Outcome.ok(this.increment())
            },
            onDone: (result) => {
                if (!Job.isCancelled(result)) return
                this.update({ testInt: 0 })
            },
        })

    testEffect3 = () =>
        this.effect({
            id: TestBloc.Effects.Test3,
            block: async (job) => {
                await job.delay(500)
                return Outcome.ok(this.increment())
            },
            onDone: () => {
                this.decrement()
                this.decrement()
            },
        })

    noCancelOnDisposeEffect = () =>
        this.effect({
            id: TestBloc.Effects.NoCancelOnDispose,
            cancelOnDispose: false,
            block: async (job) => {
                await job.delay(500)
                return Outcome.ok(this.increment())
            },
        })

    cancelTestEffect = () => this.cancelEffect(this.testEffect)
    cancelTestEffect2 = () => this.cancelEffect(this.testEffect2)
    cancelTestEffect3 = () => this.cancelEffect(TestBloc.Effects.Test3)
}

type TestDependencyState = {
    count: number
    dependentString: string
    dependentInt: number
}

class TestDependencyBloc extends Bloc<TestDependencyState, [TestBloc]> {
    constructor(private testBloc: TestBloc) {
        super({
            initialState: { count: 0, dependentString: "", dependentInt: 0 },
            retainStateOnDispose: true,
            dependencies: [testBloc],
        })
    }

    override computed(state: TestDependencyState, [testBloc]: [TestBloc]): Partial<TestDependencyState> {
        return {
            ...state,
            dependentString: testBloc.state.testString,
            dependentInt: testBloc.state.testInt,
        }
    }

    set(value: number) {
        this.update({ count: value })
    }
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
