import { identity } from 'lodash'

export type Logger = (...msgs: unknown[]) => void

export const logNoop: Logger = identity
