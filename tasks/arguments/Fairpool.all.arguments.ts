import { Fairpool__factory } from '../../typechain-types'
import { DefaultSlope, DefaultWeight } from '../../libs/fairpool/constants'
import { getSharePercent } from '../../libs/fairpool/utils'
import { getStringEnvVar } from '../../libs/utils/process'

const args: Parameters<Fairpool__factory['deploy']> = [
  getStringEnvVar('NAME', process.env.NAME, 'Official Fairpool Token'),
  getStringEnvVar('SYMBOL', process.env.SYMBOL, 'FAIR'),
  DefaultSlope,
  DefaultWeight,
  getSharePercent(75, 1000),
  getSharePercent(200, 1000),
  [],
  [],
]

export default args
