import { Logger } from './log'

export function logDryRun(log: Logger) {
  return log('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}
