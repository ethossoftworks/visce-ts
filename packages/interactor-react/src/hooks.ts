import isEqual from "lodash.isequal"
import { DependencyList, useLayoutEffect, useMemo, useRef, useState } from "react"
import { distinctUntilChanged, map, skip } from "rxjs/operators"
import { Interactor, InteractorStateType } from "./Interactor"

/**
 * Subscribes to a Interactor and returns its state. The view will be updated when the interactor is updated.
 */
export function useInteractor<T extends () => Interactor<any>>(
    factory: T,
    dependencies: DependencyList = []
): [InteractorStateType<ReturnType<T>>, ReturnType<T>] {
    const [_, setState] = useState<object>({})
    const interactor = useMemo(factory, dependencies) as ReturnType<T>

    useLayoutEffect(() => {
        const subscription = interactor.stream.pipe(skip(1)).subscribe({ next: () => setState({}) })
        return () => subscription.unsubscribe()
    }, [])

    return [interactor.state, interactor]
}

/**
 * Subscribes to a selection Interactor state and returns the selected state. The view will be updated when the interactor is
 * updated and the selected state has changed.
 */
export function useInteractorSelector<T extends () => Interactor<any>, R>(
    factory: T,
    selector: (state: InteractorStateType<T>) => R,
    dependencies: DependencyList = []
): [R, ReturnType<T>] {
    const interactor = useMemo(factory, dependencies) as ReturnType<T>
    const [_, setState] = useState<object>({})
    const stateRef = useRef<R | null>(null)

    if (stateRef.current === null) stateRef.current = selector(interactor.state)

    useLayoutEffect(() => {
        const subscription = interactor.stream
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

    return [stateRef.current ?? selector(interactor.state), interactor]
}
