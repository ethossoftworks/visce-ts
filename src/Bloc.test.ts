import { Outcome } from "@ethossoftworks/outcome"
import { first } from "rxjs/operators"
import { Bloc } from "./bloc"
import { JobCancellationException } from "@ethossoftworks/job"
import { fail, test, expect } from "@ethossoftworks/knock-on-wood"

export function blocTests() {
    test("Get current state on subscribe", async () => {
        const bloc = new TestBloc()
        const result = await bloc.stream.pipe(first()).toPromise()
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
        await subscription.unsubscribe()
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
        await subscription.unsubscribe()
        expect(eventCount, 3, `Expected 3 emits and got ${eventCount}`)
    })

    test("On Start", async () => {
        var onStartedCount = 0
        const bloc = new TestBloc({ onStartCallback: () => onStartedCount++ })
        expect(onStartedCount, 0, "On Started was called before subscription")
        await bloc.stream.pipe(first()).toPromise()
        expect(onStartedCount, 1, "On Started was not called")
        await bloc.stream.pipe(first()).toPromise()
        expect(onStartedCount, 2, "On Started was not called after dispose")
    })

    test("On Dispose", async () => {
        var onDisposedCount = 0
        const bloc = new TestBloc({ onDisposeCallback: () => onDisposedCount++ })
        expect(onDisposedCount, 0, "onDispose was called before subscription")
        const subscription1 = bloc.stream.subscribe((event) => {})
        const subscription2 = bloc.stream.subscribe((event) => {})
        expect(onDisposedCount, 0, "onDispose was called before subscription was cancelled")
        await subscription1.unsubscribe()
        expect(onDisposedCount, 0, "onDispose was called with an active subscription")
        await subscription2.unsubscribe()
        expect(onDisposedCount, 1, "onDispose was not called")
        await bloc.stream.pipe(first()).toPromise()
        expect(onDisposedCount, 2, "onDispose was not called after restart")
    })

    test("Persist State On Dispose", async () => {
        const bloc = new TestBloc({ persistStateOnDispose: false })
        bloc.increment()
        bloc.increment()
        expect(bloc.state.testInt, 2, "State did not update")
        await bloc.stream.pipe(first()).toPromise()
        expect(bloc.state.testInt, 0, "State did not reset on dispose with persistStateOnDispose == false")

        const bloc2 = new TestBloc({ persistStateOnDispose: true })
        bloc2.increment()
        bloc2.increment()
        expect(bloc2.state.testInt, 2, "State did not update")
        await bloc2.stream.pipe(first()).toPromise()
        expect(bloc2.state.testInt, 2, "State reset on dispose with persistStateOnDispose == true")
    })

    test("BlocScope", async () => {
        const bloc = new TestBloc()
        var jobCompleted = false

        const jobFuture = bloc.blocScope.launchAndRun(async (job) => {
            await job.delay(1000)
            jobCompleted = true
            return Outcome.ok(null)
        })

        await bloc.stream.pipe(first()).toPromise()
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
        expect(bloc.state.testInt, 1, "Update did not update state")
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
        if (bloc.state.testInt != 1)
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

    test("Effect cancelOnDispose", async () => {
        // cancelOnDispose == true
        const bloc = new TestBloc()
        const subscription = bloc.stream.subscribe((state) => {})
        const effectPromise = bloc.testEffect()
        subscription.unsubscribe()
        const effectResult = await effectPromise
        expect(bloc.state.testInt, 0, "State should have been 0 due to dispose")
        if (!effectResult.isError() || !(effectResult.error instanceof JobCancellationException))
            fail("Effect was not cancelled")

        // cancelOnDispose == false
        const subscription2 = bloc.stream.subscribe((state) => {})
        const effectPromise2 = bloc.noCancelOnDisposeEffect()
        subscription2.unsubscribe()
        const effectResult2 = await effectPromise2
        expect(bloc.state.testInt, 1, "State should have been 1 due to cancelOnDispose == false")
        if (!effectResult2.isOk() || effectResult2.value.testInt !== 1) fail("Effect was cancelled")
    })
}

type _TestState = {
    testString: string
    testInt: number
}

function newTestState(): _TestState {
    return { testInt: 0, testString: "Test" }
}

class TestBloc extends Bloc<_TestState> {
    onStartCallback?: () => void
    onDisposeCallback?: () => void

    private static Effects = {
        Test: "testEffect",
        Test2: "testEffect2",
        NoCancelOnDispose: "noCancelOnDisposeEffect",
    }

    constructor(options?: {
        persistStateOnDispose?: boolean
        onStartCallback?: () => void
        onDisposeCallback?: () => void
    }) {
        super(newTestState(), options?.persistStateOnDispose ?? false)
        this.onStartCallback = options?.onStartCallback
        this.onDisposeCallback = options?.onDisposeCallback
    }

    onStart() {
        this.onStartCallback?.()
    }

    onDispose() {
        this.onDisposeCallback?.()
    }

    increment = () => this.update((state) => ({ ...state, testInt: state.testInt + 1 }))

    setString = (value: string) => this.update((state) => ({ ...state, testString: value }))

    testEffect = () =>
        this.effect({
            id: TestBloc.Effects.Test,
            block: async (job) => {
                await job.delay(500)
                return Outcome.ok(this.increment())
            },
        })

    testEffect2 = () =>
        this.effect({
            id: TestBloc.Effects.Test2,
            block: async (job) => {
                await job.delay(500)
                return Outcome.ok(this.increment())
            },
            onCancel: () => this.update((state) => ({ ...state, testInt: 0 })),
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

    cancelTestEffect = () => this.cancelEffect(TestBloc.Effects.Test)
    cancelTestEffect2 = () => this.cancelEffect(TestBloc.Effects.Test2)
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
