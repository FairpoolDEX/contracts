import { BN } from './index'

export const zero = BN.from(0)

export const one = BN.from(1)

export const ten = BN.from(10)

export const tenPow18 = ten.pow(18)

export const uint256Max = BN.from(2).pow(256).sub(1)
