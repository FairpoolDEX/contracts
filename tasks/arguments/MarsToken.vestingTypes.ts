import { parseVestingTypes } from '../../models/VestingType'
import { scaledShare, zeroShare } from '../../test/support/Vesting.helpers'
import { months } from '../../util/time'

export default parseVestingTypes([
  {
    name: 'Team',
    initialShare: zeroShare(),
    monthlyShare: scaledShare(105556),
    cliff: 12 * months,
  },
])
