import { MathOutOfBounds } from './Math.errors'

export type ERC20EnumerableError = MathOutOfBounds | TransferFromZeroAddress | TransferToZeroAddress | TransferAmountExceedsBalance | MintToZeroAddress | BurnFromZeroAddress | BurnAmountExceedsBalance

export class TransferFromZeroAddress extends Error {
  constructor() {
    super('ERC20: transfer from the zero address')
  }
}

export class TransferToZeroAddress extends Error {
  constructor() {
    super('ERC20: transfer to the zero address')
  }
}

export class TransferAmountExceedsBalance extends Error {
  constructor() {
    super('ERC20: transfer amount exceeds balance')
  }
}

export class MintToZeroAddress extends Error {
  constructor() {
    super('ERC20: mint to the zero address')
  }
}

export class BurnFromZeroAddress extends Error {
  constructor() {
    super('ERC20: burn from the zero address')
  }
}

export class BurnAmountExceedsBalance extends Error {
  constructor() {
    super('ERC20: burn amount exceeds balance')
  }
}
