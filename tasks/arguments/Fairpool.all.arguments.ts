import { Fairpool__factory } from '../../typechain-types'
import { DefaultBaseLimit, DefaultPrecision, DefaultQuoteOffset } from '../../libs/fairpool/constants'
import { getStringEnvVar } from '../../libs/utils/process'
import { todo } from '../../libs/utils/todo'

// const contract = await context.ethers.getContractAt('Fairpool', '0x3fb9576809E0e908b2E44BF4C191fe33f3121436')
// await contract.setEarnings(150000)
// return

const args: Parameters<Fairpool__factory['deploy']> = [
  getStringEnvVar('NAME', process.env.NAME, 'Official Fairpool Token'),
  getStringEnvVar('SYMBOL', process.env.SYMBOL, 'FAIR'),
  DefaultBaseLimit,
  DefaultQuoteOffset,
  DefaultPrecision,
  todo([]),
  todo([]),
  todo([]),
  todo([]),
]

export default args
