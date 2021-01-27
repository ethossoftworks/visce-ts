import React from "react"
import { CSSTransition } from "react-transition-group"

export type ModalProps = {
    isVisible: boolean
    title: string
    message: string
    buttons: ModalButton[]
}

export type ModalButton = {
    label: string
    onClick: () => void
}

export function Modal({ isVisible, title, message, buttons }: ModalProps): JSX.Element | null {
    return (
        <CSSTransition classNames="modal" in={isVisible} timeout={250} appear={true} unmountOnExit={true}>
            <div className="modal-wrapper">
                <div className="modal">
                    <div className="modal-title">{title}</div>
                    <div className="modal-message">{message}</div>
                    <div className="modal-button-cont">
                        {buttons.map((button) => (
                            <div
                                key={button.label}
                                className="modal-button"
                                onClick={() => {
                                    button.onClick()
                                }}
                            >
                                {button.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CSSTransition>
    )
}
