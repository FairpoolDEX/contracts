import { Fairpool__factory } from '../../typechain-types'
import { getScaledPercent } from '../../test/support/Fairpool.helpers'
import { getShare } from '../../libs/bn/utils'
import { DefaultScale } from '../../libs/fairpool/constants'

const args: Parameters<Fairpool__factory['deploy']> = [
  'Official Fairpool Token',
  'FAIR',
  getShare(DefaultScale, 1, 1000),
  getScaledPercent(7),
  getScaledPercent(20),
  [],
  [],
]

export default args
