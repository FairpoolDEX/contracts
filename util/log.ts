import { identity } from 'lodash'

export type Logger = (...msgs: any[]) => void

export const logNoop: Logger = identity
