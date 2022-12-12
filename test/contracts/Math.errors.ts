export type MathOutOfBoundsOperation = 'add' | 'sub'

export const MathOutOfBoundsOperationDirection: Record<MathOutOfBoundsOperation, string> = {
  add: 'overflow',
  sub: 'underflow',
}

export class MathOutOfBounds extends Error {
  constructor(operation: MathOutOfBoundsOperation) {
    super(`Math: ds-math-${operation}-${MathOutOfBoundsOperationDirection[operation]}`)
  }
}
