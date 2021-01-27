export const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export const notEmpty = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined

export const arrayOfNotNull = <T>(array: (T | null | undefined)[]) => array.filter(notEmpty)
