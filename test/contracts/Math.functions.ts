import { AmountBN } from '../../models/AmountBN'
import { MaxUint256 } from '../support/all.helpers'
import { MathOutOfBounds } from './Math.errors'

export const add = (max: AmountBN) => (a: AmountBN, b: AmountBN) => {
  const result = a.add(b)
  if (result.gt(max)) {
    throw new MathOutOfBounds('add')
  } else {
    return result
  }
}

export const sub = (a: AmountBN, b: AmountBN) => {
  const result = a.sub(b)
  if (result.lt(0)) {
    throw new MathOutOfBounds('sub')
  } else {
    return result
  }
}

export const addUint = add(MaxUint256)

export const subUint = sub
