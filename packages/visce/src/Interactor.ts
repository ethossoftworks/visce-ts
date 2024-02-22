import { SupervisorJob } from "@ethossoftworks/job"
import isEqual from "lodash.isequal"
import { BehaviorSubject, Observable, Subscription } from "rxjs"
import { distinctUntilChanged, skip } from "rxjs/operators"

export interface IInteractor<T> {
    state: T
    stream: Observable<T>
}

/**
 * [Interactor]
 * An isolated slice of safely mutable, observable state that encapsulates business logic pertaining to state
 * manipulation.
 *
 * Observing State
 * When an observer subscribes to state via the [stream] method it will immediately receive the latest state as the first
 * emit. Afterward, only changes to the state will be emitted to observers.
 *
 * Updating State
 * The only way to update an [Interactor]'s state is by calling the [update] method. Calling [update] will synchronously
 * update the internal state with a new copy of state and notify all observers of the change as long as the new state is
 * different from the previous state.
 *
 * [initialState] The initial state of an Interactor.
 *
 * [dependencies] A list of [Interactor]s this [Interactor] is dependent on. When any dependent [Interactor] is updated,
 * the [computed] function is called and the resulting state is emitted to all subscribers of this [Interactor].
 */
export abstract class Interactor<T> implements IInteractor<T> {
    private readonly initialState: T
    private readonly dependencies: IInteractor<any>[]
    private dependencySubscriptions: Subscription[] = []
    private _observers: number = 0
    private readonly _state: Lazy<BehaviorSubject<T>> = new Lazy(() => {
        return new BehaviorSubject(this.nextStateWithComputed(this.initialState))
    })

    /**
     * Provides a mechanism to allow launching tasks following structured concurrency.
     */
    protected readonly interactorScope = new SupervisorJob()

    private readonly _proxy: Observable<T> = new Observable<T>((subscriber) => {
        if (this.dependencies.length > 0) this._state.value.next(this.nextStateWithComputed(this._state.value.value))
        this.handleSubscribe()
        this._observers++
        Logger.log("Adding Interactor dependency", this.constructor.name)

        const subscription = this._state.value.subscribe({
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

    constructor({ initialState, dependencies }: { initialState: T; dependencies: IInteractor<any>[] }) {
        this.dependencies = dependencies
        this.initialState = initialState
        sendDevToolsUpdate(this, "New Interactor", initialState)
    }

    /**
     * Returns the current state of the Interactor.
     */
    get state(): T {
        return this.dependencies.length > 0 && this._observers == 0
            ? this.nextStateWithComputed(this._state.value.value)
            : this._state.value.value
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
    protected computed?(state: T): Partial<T> {
        return state
    }

    /**
     * Immutably update the state and notify all subscribers of the change.
     */
    protected update(state: Partial<T>): T {
        const newState = { ...this.state, ...state }
        this._state.value.next(this.nextStateWithComputed(newState))
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
        return this.computed ? { ...state, ...this.computed(state) } : state
    }
}

/**
 * Create a functional [Interactor] without having to extend the Interactor class. It is recommended to extend the
 * [Interactor] class directly, but sometimes that may not be possible. [createInteractor] provides an alternative
 * means of creating an [Interactor].
 *
 * Example:
 * ```
 * const interactor = createInteractor({
 *     initialState: newTestState(),
 *     dependencies: [],
 *     computed: (state) => ({ ...state, testInt: state.testString.length }),
 *     hooks: (update, interactor) => ({
 *         test() {
 *             update({ testString: "Test Succeeded" })
 *         },
 *     }),
 * })
 * ```
 */
export function createInteractor<T, H>({
    initialState,
    dependencies,
    computed,
    hooks,
}: {
    initialState: T
    dependencies: IInteractor<any>[]
    computed: (state: T) => T
    hooks: (hookFactory: (state: Partial<T>) => T, interactor: IInteractor<T>) => H
}): H & IInteractor<T> {
    const interactor = new (class extends Interactor<T> {
        public resolvedHooks: H

        constructor() {
            super({
                initialState: initialState,
                dependencies: dependencies,
            })
            this.resolvedHooks = hooks(this.update.bind(this), this)
        }

        protected override computed(state: T): Partial<T> {
            return computed(state)
        }
    })()

    return {
        ...interactor.resolvedHooks,
        get state(): T {
            return interactor.state
        },
        get stream(): Observable<T> {
            return interactor.stream
        },
    }
}

/**
 * Returns the type of the state the Interactor contains
 */
export type InteractorStateType<B> = B extends Interactor<infer S> ? S : any

class Lazy<T> {
    private hasInitialized: boolean = false
    private _value: T | null = null

    constructor(private initializer: () => T) {}

    get value(): T {
        if (!this.hasInitialized) {
            this._value = this.initializer()
            this.hasInitialized = true
        }
        return this._value as T
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

// Connect with Redux Dev Tools
let devTools: null | any = null
let devToolsState = {}

async function connectDevTools() {
    const devToolsExt = (global.window as any)?.__REDUX_DEVTOOLS_EXTENSION__
    if (devToolsExt === undefined) return
    devTools = devToolsExt.connect({ name: "Interactor" })
    devTools.init(devToolsState)
}

async function sendDevToolsUpdate(interactor: Interactor<any>, action: string, state: any) {
    if (!devTools || devTools.send === undefined) return
    devToolsState = { ...devToolsState, [interactor.constructor.name]: state }
    devTools.send({ type: `${interactor.constructor.name} - ${action}`, state: state }, devToolsState)
}

if (process.env.NODE_ENV === "development") {
    connectDevTools()
}
