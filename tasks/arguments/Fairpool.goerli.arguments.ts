import { Fairpool__factory } from '../../typechain-types'
import { getWeightedPercent } from '../../test/support/Fairpool.helpers'
import { DefaultQuoteBuffer } from '../../libs/fairpool/constants'

const args: Parameters<Fairpool__factory['deploy']> = [
  'Official Fairpool Token',
  'FAIR',
  DefaultQuoteBuffer,
  getWeightedPercent(1, 1000),
  getWeightedPercent(7),
  getWeightedPercent(20),
  [],
  [],
]

export default args
