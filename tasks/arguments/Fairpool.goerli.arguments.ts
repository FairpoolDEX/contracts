import { Fairpool__factory } from '../../typechain-types'
import { getScaledPercent, scale } from '../../test/support/Fairpool.helpers'
import { getShare } from '../../libs/bn/utils'

const args: Parameters<Fairpool__factory['deploy']> = [
  'Official Fairpool Token',
  'FAIR',
  getShare(scale, 1, 1000),
  getScaledPercent(7),
  getScaledPercent(20),
  [],
  [],
]

export default args
