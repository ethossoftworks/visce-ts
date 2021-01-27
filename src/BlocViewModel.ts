import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import { Bloc } from "./Bloc"

type BlocViewModelConstructorBlocs<T extends unknown[]> = {
    [K in keyof T]: Bloc<T[K]>
}

/**
 * Allows a view/component to merge several blocs and select the state only it cares about
 *
 * Type parameter S is a tuple of the Bloc state types
 * Type parameter R is the returned merged state type
 */
export abstract class BlocViewModel<S extends unknown[], R> {
    constructor(private blocs: BlocViewModelConstructorBlocs<S>) {}

    /**
     * Retrieves the current state from blocs and passes it through the selector to return the merged state
     */
    get state(): R {
        return this.transform(this.blocs.map((bloc) => bloc.state) as S)
    }

    /**
     * Creates a stream of selected state for all blocs
     */
    get stream(): Observable<R> {
        return combineLatest(this.blocs.map((bloc) => bloc.stream)).pipe(map((state) => this.transform(state as S)))
    }

    /**
     * Merges bloc state and returns a newly constructed transformed state
     */
    abstract transform(state: S): R
}
