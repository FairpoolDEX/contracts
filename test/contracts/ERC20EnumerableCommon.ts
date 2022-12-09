import { Address } from '../../models/Address'
import { AmountBN } from '../../models/AmountBN'

export enum ERC20EnumerableError {
  MathSubOverflow = 'Math: ds-math-sub-overflow',
  MathAddOverflow = 'Math: ds-math-add-overflow',
  MathSubUnderflow = 'Math: ds-math-sub-underflow',
  MathAddUnderflow = 'Math: ds-math-add-underflow',
  TransferFromZeroAddress = 'ERC20: transfer from the zero address',
  TransferToZeroAddress = 'ERC20: transfer to the zero address',
  TransferAmountExceedsBalance = 'ERC20: transfer amount exceeds balance',
  MintToZeroAddress = 'ERC20: mint to the zero address',
  BurnFromZeroAddress = 'ERC20: burn from the zero address',
  BurnAmountExceedsBalance = 'ERC20: burn amount exceeds balance'
}

export type MintParams = { to: Address, amount: AmountBN }

export type TransferParams = { from: Address, to: Address, amount: AmountBN }
