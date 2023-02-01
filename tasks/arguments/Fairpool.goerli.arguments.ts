import { Fairpool__factory } from '../../typechain-types'
import { DefaultSlope, DefaultWeight } from '../../libs/fairpool/constants'
import { getSharePercent } from '../../libs/fairpool/utils'

const args: Parameters<Fairpool__factory['deploy']> = [
  'Official Fairpool Token',
  'FAIR',
  DefaultSlope,
  DefaultWeight,
  getSharePercent(7),
  getSharePercent(20),
  [],
  [],
]

export default args
