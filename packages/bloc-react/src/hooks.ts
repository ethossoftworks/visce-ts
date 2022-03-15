import isEqual from "lodash.isequal"
import { DependencyList, useLayoutEffect, useMemo, useRef, useState } from "react"
import { distinctUntilChanged, map, skip } from "rxjs/operators"
import { Bloc, BlocStateType } from "./Bloc"
import { BlocCoordinator } from "./BlocCoordinator"

/**
 * Subscribes to a Bloc and returns its state. The view will be updated when the bloc is updated.
 */
export function useBloc<T extends () => Bloc<any>>(
    factory: T,
    dependencies: DependencyList = []
): [BlocStateType<ReturnType<T>>, ReturnType<T>] {
    const [_, setState] = useState<object>({})
    const bloc = useMemo(factory, dependencies) as ReturnType<T>

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
export function useBlocSelector<T extends () => Bloc<any>, R>(
    factory: T,
    selector: (state: BlocStateType<T>) => R,
    dependencies: DependencyList = []
): [R, ReturnType<T>] {
    const bloc = useMemo(factory, dependencies) as ReturnType<T>
    const [_, setState] = useState<object>({})
    const stateRef = useRef<R | null>(null)

    if (stateRef.current === null) stateRef.current = selector(bloc.state)

    useLayoutEffect(() => {
        const subscription = bloc.stream
            .pipe(
                skip(1),
                map((value) => selector(value)),
                distinctUntilChanged(isEqual)
            )
            .subscribe({
                next: (newState) => {
                    stateRef.current = newState
                    setState({})
                },
            })
        return () => subscription.unsubscribe()
    }, [])

    return [stateRef.current ?? selector(bloc.state), bloc]
}

type BlocCoordinatorReturnType<T extends BlocCoordinator<any[], any>> = T extends BlocCoordinator<any[], infer R>
    ? R
    : unknown

/**
 * Returns a memoized BlocCoordinator and its current state.
 */
export function useBlocCoordinator<T extends () => BlocCoordinator<any[], any>>(
    factory: T,
    dependencies: DependencyList = []
): [BlocCoordinatorReturnType<ReturnType<T>>, ReturnType<T>] {
    const coordinator = useMemo(factory, dependencies)
    const [_, setState] = useState<object>({})
    const stateRef = useRef<BlocCoordinatorReturnType<ReturnType<T>> | null>(null)

    if (stateRef.current === null) stateRef.current = coordinator.state

    useLayoutEffect(() => {
        const subscription = coordinator.stream.pipe(skip(1), distinctUntilChanged(isEqual)).subscribe({
            next: (newState) => {
                stateRef.current = newState
                setState({})
            },
        })
        return () => subscription.unsubscribe()
    }, [])

    return [stateRef.current ?? coordinator.state, coordinator as ReturnType<T>]
}
