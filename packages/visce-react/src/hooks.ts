import { Interactor, InteractorStateType } from "@ethossoftworks/visce"
import { DependencyList, useLayoutEffect, useMemo, useState } from "react"
import { skip } from "rxjs/operators"

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
