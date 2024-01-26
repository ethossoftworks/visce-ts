import { SupervisorJob } from "@ethossoftworks/job"
import isEqual from "lodash.isequal"
import { BehaviorSubject, Observable, Subscription } from "rxjs"
import { distinctUntilChanged, skip } from "rxjs/operators"

/**
 * Interactor (Business Logic Component)
 * An isolated slice of safely mutable, observable state that encapsulates business logic pertaining to state
 * manipulation.
 *
 * Observing State
 * When an observer subscribes to state it will immediately receive the latest state as the first emit. Afterwards,
 * only changes to the state will be emitted to observers.
 *
 * Updating Interactor State
 * The only way to update a Interactor's state is by calling the [update] method. Calling [update] will synchronously update
 * the internal state with a new copy of state and notify all observers of the change as long as the new state is
 * different than the previous state.
 *
 * [initialState] The initial state of a Interactor.
 */
export abstract class Interactor<T, D extends Interactor<any>[] = []> {
    private readonly _state: BehaviorSubject<T>
    private readonly dependencies: D
    private dependencySubscriptions: Subscription[] = []
    private _observers: number = 0

    /**
     * Provides a mechanism to allow launching tasks following structured concurrency.
     */
    public readonly interactorScope = new SupervisorJob()

    private readonly _proxy: Observable<T> = new Observable<T>((subscriber) => {
        if (this.dependencies.length > 0) this._state.next(this.nextStateWithComputed(this._state.value))
        this.handleSubscribe()
        this._observers++
        Logger.log("Adding Interactor dependency", this.constructor.name)

        const subscription = this._state.subscribe({
            next: (value) => subscriber.next(value),
            complete: () => subscriber.complete(),
            error: (error) => subscriber.error(error),
        })

        return () => {
            this._observers--
            Logger.log("Removing Interactor dependency", this.constructor.name)
            subscription.unsubscribe()
            this.handleUnsubscribe()
        }
    }).pipe(distinctUntilChanged(isEqual))

    constructor({ initialState, dependencies }: { initialState: T; dependencies: D }) {
        this.dependencies = dependencies
        this._state = new BehaviorSubject(this.nextStateWithComputed(initialState))
        sendDevToolsUpdate(this, "New Interactor", this.state)
    }

    /**
     * Returns the current state of the Interactor.
     */
    get state(): T {
        return this.dependencies.length > 0 && this._observers == 0
            ? this.nextStateWithComputed(this._state.value)
            : this._state.value
    }

    /**
     * Returns the state as a stream/observable for observing updates. The latest state will be immediately emitted
     * to a new subscriber.
     */
    get stream() {
        return this._proxy
    }

    /**
     * Computes properties based on latest state for every update
     */
    protected computed?(state: T, dependencies: D): Partial<T> {
        return state
    }

    /**
     * Immutably update the state and notify all subscribers of the change.
     */
    protected update(state: Partial<T>): T {
        const newState = { ...this.state, ...state }
        this._state.next(this.nextStateWithComputed(newState))
        sendDevToolsUpdate(this, "Update", this.state)
        return newState
    }

    private handleSubscribe() {
        if (this._observers > 0) return

        this.dependencySubscriptions = this.dependencies.map((interactor) =>
            interactor.stream.pipe(skip(1)).subscribe(() => this.update(this.state))
        )
        Logger.log("Starting Interactor", this.constructor.name)
    }

    private handleUnsubscribe() {
        if (this._observers > 0) return

        Logger.log("Disposing Interactor", this.constructor.name)
        this.dependencySubscriptions.forEach((sub) => sub.unsubscribe())
        this.dependencySubscriptions = []
    }

    private nextStateWithComputed(state: T): T {
        return this.computed ? { ...state, ...this.computed(state, this.dependencies) } : state
    }
}

/**
 * Returns the type of the state the Interactor contains
 */
export type InteractorStateType<B> = B extends Interactor<infer S> ? S : any

class Logger {
    readonly LEVEL_DEBUG = 0
    readonly LEVEL_PROD = 1

    static level = 1

    static log(...values: any[]) {
        if (this.level === 1) return
        console.log(...values)
    }
}

// Connect with Redux Dev Tools
let devTools: null | any = null
let devToolsState = {}

async function connectDevTools() {
    const devToolsExt = (global.window as any)?.__REDUX_DEVTOOLS_EXTENSION__
    if (devToolsExt === undefined) return
    devTools = devToolsExt.connect({ name: "Interactor" })
    devTools.init(devToolsState)
}

async function sendDevToolsUpdate(interactor: Interactor<any, any>, action: string, state: any) {
    if (!devTools || devTools.send === undefined) return
    devToolsState = { ...devToolsState, [interactor.constructor.name]: state }
    devTools.send({ type: `${interactor.constructor.name} - ${action}`, state: state }, devToolsState)
}

if (process.env.NODE_ENV === "development") {
    connectDevTools()
}
