import { Fairpool__factory } from '../../typechain-types'
import { DefaultSlope, DefaultWeight } from '../../libs/fairpool/constants'
import { getSharePercent } from '../../libs/fairpool/utils'
import { getStringEnvVar } from '../../libs/utils/process'

// const contract = await context.ethers.getContractAt('Fairpool', '0x3fb9576809E0e908b2E44BF4C191fe33f3121436')
// await contract.setEarnings(150000)
// return

const args: Parameters<Fairpool__factory['deploy']> = [
  getStringEnvVar('NAME', process.env.NAME, 'Official Fairpool Token'),
  getStringEnvVar('SYMBOL', process.env.SYMBOL, 'FAIR'),
  DefaultSlope,
  DefaultWeight,
  getSharePercent(75, 1000),
  getSharePercent(150, 1000),
  [],
  [],
]

export default args
