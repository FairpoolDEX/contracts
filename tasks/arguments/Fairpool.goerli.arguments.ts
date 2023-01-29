import { Fairpool__factory } from '../../typechain-types'
import { getSharePercent, getWeightPercent } from '../../test/support/Fairpool.helpers'
import { DefaultSlope } from '../../libs/fairpool/constants'

const DefaultWeight = getWeightPercent(33)
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
