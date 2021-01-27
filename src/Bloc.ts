import { Outcome } from "@ethossoftworks/outcome"
import isEqual from "lodash.isequal"
import { BehaviorSubject, Observable } from "rxjs"
import { distinctUntilChanged } from "rxjs/operators"
import { Job, JobFunc, SupervisorJob } from "@ethossoftworks/job"

/**
 * Bloc (Business Logic Component)
 * A composable block of observable state and functionality to immutably update state.
 *
 * Bloc Lifecycle
 * A Bloc's lifecycle is dependent on its observers. When the first observer observes the Bloc [onStart] is called.
 * When the last observer stops observing [onDispose] is called. A Bloc may choose to reset its state when [onDispose]
 * is called by setting [persistStateOnDispose] to false. A Bloc will call [onStart] again if it gains a new
 * observer after it has been disposed. Likewise, a Bloc will call [onDispose] again if it loses those observers.
 *
 * Observing State
 * When an observer observes state it will immediately receive the latest state as the first emit. Afterwards, only
 * changes to the state will be emitted to observers.
 *
 * Updating Bloc State
 * The only way to update a Bloc's state is by calling the [update] method. Calling [update] will synchronously update
 * the internal state with a new copy of state and notify all observers of the change as long as the new state is
 * different than the previous state.
 *
 * Bloc Effects
 * Effects are asynchronous functions that update the state over time. An effect can be created by creating
 * an asynchronous function that calls [update] multiple times or by using the [effect] method. The [effect] method
 * provides a built-in cancellation mechanism. Calling an effect multiple times will cancel the previously called
 * effect and replace it with the newly called effect. The [effect] method also allows configuring whether or not the
 * effect should be cancelled when the Bloc is disposed or not.
 *
 * [initialState] The initial state of a Bloc.
 *
 * [persistStateOnDispose] If false, the internal state will be reset to [initialState] when the bloc is
 * disposed. If true, the bloc's state will persist until the bloc is garbage collected.
 */
export abstract class Bloc<T> {
    private readonly _effects: Map<string, CancellableEffect<any>> = new Map()
    private readonly _state: BehaviorSubject<T>

    /**
     * Provides a mechanism to allow launching [Job]s externally that follow the Bloc's lifecycle. All [Job]s launched
     * in [blocScope] will be cancelled when the Bloc is disposed.
     */
    public readonly blocScope = new SupervisorJob()

    private readonly _proxy: Observable<T> = new Observable((subscriber) => {
        this.handleSubscribe()
        Logger.log("Adding Bloc dependency", this.constructor.name)

        const subscription = this._state.subscribe({
            next: (value) => subscriber.next(value),
            complete: () => subscriber.complete(),
            error: (error) => subscriber.error(error),
            closed: subscriber.closed,
        })

        return () => {
            Logger.log("Removing Bloc dependency", this.constructor.name)
            subscription.unsubscribe()
            this.handleUnsubscribe()
        }
    }).pipe(distinctUntilChanged(isEqual))

    constructor(private initialState: T, private persistStateOnDispose: boolean = false) {
        this._state = new BehaviorSubject(initialState)
    }

    /**
     * Retrieves the current state of the Bloc.
     */
    get state(): T {
        return this._state.value
    }

    /**
     * Returns the state as a stream/observable for observing updates. The latest state will be immediately emitted
     * to a new subscriber.
     */
    get stream() {
        return this._proxy
    }

    /**
     * Called when the bloc receives its first subscription. [onStart] will be called again if it gains an
     * observer after it has been disposed.
     *
     * This is a good time to new-up any services, subscribe to dependent blocs, or open any resource handlers.
     */
    protected onStart?(): void

    /**
     * Called when the last subscription is closed. [onDispose] will be called every time all observers have stopped
     * observing.
     *
     * This is a good place to close any resource handlers or services.
     */
    protected onDispose?(): void

    /**
     * Runs a block of asynchronous code and provides a simple cancellation mechanism. If the effect is cancelled an
     * [Outcome.Error] will be returned with a [JobCancellationException] as its error value. When reusing ids, an
     * ongoing effect will be cancelled and the passed block will run in its place. This can prevent the issue where
     * two of the same effect are called and the first call hangs for a few seconds while the second completes more
     * quickly.
     *
     * [cancelOnDispose] if true, the effect will be cancelled when the Bloc is disposed if the effect is still running.
     *
     * [onCancel] a block of synchronous code to be run if the effect is cancelled. This can be used to reset state if
     * an effect is cancelled.
     */
    protected async effect<R>({
        id,
        block,
        cancelOnDispose = true,
        onCancel,
    }: {
        id: string
        block: JobFunc<R>
        cancelOnDispose?: boolean
        onCancel?: () => any
    }): Promise<Outcome<R>> {
        this.cancelEffect(id)

        const effect = new CancellableEffect(new Job(block), cancelOnDispose, onCancel)
        this._effects.set(id, effect)
        const result = await effect.run()
        if (this._effects.get(id) === effect) this._effects.delete(id)
        return result
    }

    /**
     * Cancels an effect with the given [id].
     */
    protected cancelEffect(id: string) {
        this._effects.get(id)?.cancel()
        this._effects.delete(id)
    }

    /**
     * Immutably update the state and notify all subscribers of the change.
     */
    protected update(block: (state: T) => T): T {
        const newState = block(this.state)
        this._state.next(newState)
        return newState
    }

    private handleSubscribe() {
        if (this._state.observers.length > 0) return
        Logger.log("Starting Bloc", this.constructor.name)
        this.onStart?.()
    }

    private handleUnsubscribe() {
        if (this._state.observers.length > 0) return
        Logger.log("Disposing Bloc", this.constructor.name)
        this._effects.forEach((effect, key) => (effect.cancelOnDispose ? effect.cancel() : null))
        this._effects.clear()
        this.blocScope.cancelChildren()
        if (!this.persistStateOnDispose) this._state.next(this.initialState)
        this.onDispose?.()
    }
}

/**
 * Returns the type of the state the Bloc contains
 */
export type BlocStateType<B> = B extends Bloc<infer S> ? S : any

class CancellableEffect<T> {
    constructor(private job: Job<T>, public cancelOnDispose: boolean, private onCancel?: () => void) {}

    run = (): Promise<Outcome<T>> => this.job.run()

    cancel() {
        Logger.log("Bloc effect cancelled")
        this.job.cancel()
        this.onCancel?.()
    }
}

class Logger {
    readonly LEVEL_DEBUG = 0
    readonly LEVEL_PROD = 1

    static level = 1

    static log(...values: any[]) {
        if (this.level === 1) return
        console.log(...values)
    }
}
