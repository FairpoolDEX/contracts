import { Address, AddressSchema, getAddressUid } from '../models/Address'
import { getInserter } from '../util/zod'

export const allAddresses: Address[] = []

export const addAddress = getInserter('Address', AddressSchema, getAddressUid, allAddresses)

export const deployer = addAddress('0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D')

export const CryptStylo = addAddress('0x81DC6F15eE72F6E6d49CB6Ca44C0Bf8E63770027')

export const winooze = addAddress('0x86F7E1B163D8E7F85DEF9Ca6301Ce2B41f5c76ce')

export const NFTradePool = addAddress('0x33a4288AB7043C274AACD2c9Eb8a931c30C0288a')

export const TeamFinanceLiquidityLocker = addAddress('0xc77aab3c6d7dab46248f3cc3033c856171878bd5')

export const $zero = addAddress('0x0000000000000000000000000000000000000000')
