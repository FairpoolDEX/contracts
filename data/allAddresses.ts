import { Address, validateAddress, validateAddresses } from '../models/Address'
import { BalanceBN } from '../models/BalanceBN'
import { nail } from '../libs/utils/string'

export const $zero = validateAddress('0x0000000000000000000000000000000000000000')

export const oldSoftwareDeployer = validateAddress('0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D')

/**
 * MM Test
 */
export const newSoftwareDeployer = validateAddress('0x64D0991Bcc3cD7B6dB859793Fe156704E372663D')

export const newHardwareDeployer = validateAddress('0x7554140235ad2D1Cc75452D2008336700C598Dc1')

export const marketing = validateAddress('0x2d3be8E442bdeF1b263160fda6C86E560CE7E4Ad')

export const CS = validateAddress('0x81DC6F15eE72F6E6d49CB6Ca44C0Bf8E63770027')

export const KS = validateAddress('0x86F7E1B163D8E7F85DEF9Ca6301Ce2B41f5c76ce')

export const Van1sh = validateAddress('0xAd05dD04eaa5BA87F84bCcBe10E0715cD2eda08c')

export const Eddy = validateAddress('0x9e8073406Ce51835E9A61398bEd71640ce6cC258')

export const Jordan = validateAddress('0xc017D08b5B8e4ec763c9f1eE252aE22Bb31D83B3')

export const ChrSc = validateAddress('0x53cC4422e3ADf3A75051D4D21069B704c46c91C6')

export const DanDB = validateAddress('0xeDB28Ab9B1b0ac1C37d01BCFB868580eFD20A8a4')

export const NFTradePool = validateAddress('0x33a4288AB7043C274AACD2c9Eb8a931c30C0288a')

export const TeamFinanceLiquidityLocker = validateAddress('0xc77aab3c6d7dab46248f3cc3033c856171878bd5')

export const bullSellers = validateAddresses(
  nail(`
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
  `).trim().split('\n')
)

export function isBullSellerAddress(address: Address) {
  return bullSellers.includes(address)
}

export function isBullSellerBalance(balance: BalanceBN) {
  return isBullSellerAddress(balance.address)
}
