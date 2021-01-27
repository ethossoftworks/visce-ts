import isEqual from "lodash.isequal"
import { useLayoutEffect, useMemo } from "react"
import { useState } from "react"
import { distinctUntilChanged, map, skip } from "rxjs/operators"
import { Bloc, BlocStateType, BlocViewModel } from "@ethossoftworks/bloc"

/**
 * Subscribes to a Bloc and returns its state. The view will be updated when the bloc is updated.
 */
export function useBloc<T extends Bloc<any>, R>(bloc: T): [BlocStateType<T>, typeof bloc] {
    const [_, setState] = useState<object>({})

    useLayoutEffect(() => {
        const subscription = bloc.stream.pipe(skip(1)).subscribe({ next: () => setState({}) })
        return () => subscription.unsubscribe()
    }, [])

    return [bloc.state, bloc]
}

/**
 * Subscribes to a selection Bloc state and returns the selected state. The view will be updated when the bloc is
 * updated and the selected state has changed.
 */
export function useBlocSelector<T extends Bloc<any>, R>(
    bloc: T,
    selector: (state: BlocStateType<T>) => R
): [R, typeof bloc] {
    const [_, setState] = useState<object>({})

    useLayoutEffect(() => {
        const subscription = bloc.stream
            .pipe(
                skip(1),
                map((value) => selector(value)),
                distinctUntilChanged(isEqual)
            )
            .subscribe({ next: () => setState({}) })
        return () => subscription.unsubscribe()
    }, [])

    return [selector(bloc.state), bloc]
}

/**
 * Creates a memoized Bloc with the given factory and subscribes to the it. This is useful for creating a Bloc
 * inside of a component and using it for state management.
 */
export function useMemoBloc<T extends () => Bloc<any>>(factory: T): [ReturnType<T>, BlocStateType<T>] {
    return useBloc(useMemo(factory, [])) as [ReturnType<T>, BlocStateType<T>]
}

type BlocViewModelReturnType<T extends BlocViewModel<any[], any>> = T extends BlocViewModel<any[], infer R>
    ? R
    : unknown

/**
 * Returns a memoized BlocViewModel and its current state.
 */
export function useBlocViewModel<T extends () => BlocViewModel<any[], any>>(
    factory: T
): [BlocViewModelReturnType<ReturnType<T>>, ReturnType<T>] {
    const viewModel = useMemo(factory, [])
    const [_, setState] = useState<object>({})

    useLayoutEffect(() => {
        const subscription = viewModel.stream
            .pipe(skip(1), distinctUntilChanged(isEqual))
            .subscribe({ next: () => setState({}) })
        return () => subscription.unsubscribe()
    }, [])

    return [viewModel.state, viewModel as ReturnType<T>]
}
