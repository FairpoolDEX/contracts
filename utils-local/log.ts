export type Logger = (...msgs: unknown[]) => void

export const info = console.info.bind(console)
