import React from "react"

export type LoaderProps = {
    isVisible: boolean
}

export function Loader({ isVisible }: LoaderProps): JSX.Element | null {
    return isVisible ? <div>Loading...</div> : null
}
