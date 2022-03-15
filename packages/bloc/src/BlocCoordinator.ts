import isEqual from "lodash.isequal"
import { combineLatest, Observable } from "rxjs"
import { distinctUntilChanged, map, tap } from "rxjs/operators"
import { Bloc } from "./Bloc"

type BlocCoordinatorConstructorBlocs<T extends unknown[]> = {
    [K in keyof T]: Bloc<T[K]>
}

/**
 * Allows a view/component to merge several blocs and select the state only it cares about
 *
 * Type parameter S is a tuple of the Bloc state types
 * Type parameter R is the returned merged state type
 */
export abstract class BlocCoordinator<S extends unknown[], R> {
    private readonly _proxy: Observable<R>

    constructor(private blocs: BlocCoordinatorConstructorBlocs<S>) {
        this._proxy = combineLatest(this.blocs.map((bloc) => bloc.stream)).pipe(
            map((state) => this.transform(state as S)),
            distinctUntilChanged(isEqual),
            tap((s) => this.react?.(s))
        )
    }

    /**
     * Retrieves the current state from blocs and passes it through transform() to return the merged state
     */
    get state(): R {
        return this.transform(this.blocs.map((bloc) => bloc.state) as S)
    }

    /**
     * Creates a stream of selected state for all blocs
     */
    get stream(): Observable<R> {
        return this._proxy
    }

    /**
     * Merges bloc state and returns the newly constructed transformed state
     */
    protected abstract transform(state: [...S]): R

    /**
     * React to updates of transformed state
     */
    protected react?(state: R): void
}
