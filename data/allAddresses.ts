import { Address, AddressSchema, getAddressUid, validateAddress } from '../models/Address'
import { getInserter } from '../util/zod'
import { nail } from '../util/string'
import { BalanceBN } from '../models/BalanceBN'

export const allAddresses: Address[] = []

export const addAddress = getInserter('Address', AddressSchema, getAddressUid, allAddresses)

export const $zero = addAddress('0x0000000000000000000000000000000000000000')

export const oldDeployer = addAddress('0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D')

export const marketing = addAddress('0x2d3be8E442bdeF1b263160fda6C86E560CE7E4Ad')

export const CS = addAddress('0x81DC6F15eE72F6E6d49CB6Ca44C0Bf8E63770027')

export const KS = addAddress('0x86F7E1B163D8E7F85DEF9Ca6301Ce2B41f5c76ce')

export const Van1sh = addAddress('0xAd05dD04eaa5BA87F84bCcBe10E0715cD2eda08c')

export const Eddy = addAddress('0x9e8073406Ce51835E9A61398bEd71640ce6cC258')

export const ChrSc = addAddress('0x53cC4422e3ADf3A75051D4D21069B704c46c91C6')

export const DanDB = addAddress('0xeDB28Ab9B1b0ac1C37d01BCFB868580eFD20A8a4')

export const NFTradePool = addAddress('0x33a4288AB7043C274AACD2c9Eb8a931c30C0288a')

export const TeamFinanceLiquidityLocker = addAddress('0xc77aab3c6d7dab46248f3cc3033c856171878bd5')

export const bullSellers = nail(`
  0x551e76873AEA197309676311fD8548A8408687D9
  0x4115F5ec6c0b021dd16AFd75617D8C9DcC156774
  0x3aff228382d3D6a420f065DC87459557b4646ee1
  0x057effeeac76388CDFaAbE9751c2b8fF33b7fB71
  0x9e8073406Ce51835E9A61398bEd71640ce6cC258
  0x65c2AE7c7190630BfF933E7883CE279B466b1fEB
  0x30E3784B28332b7Cb268988F9e81eEfF9E3bF2dC
  0x1daB12BF75784d54FC30fa272ecB8C28306dBeaf
  0x0D2Be688Cb203Ee577B6bABbf84B933961497128
  0xa6B59d4419Bae35d09432F2e35176a576e02f8Ee
  0x46B8FfC41F26cd896E033942cAF999b78d10c277
`).trim().split('\n').map(validateAddress)

export function isNotBullSellerBalance(balance: BalanceBN) {
  return !bullSellers.includes(balance.address)
}
