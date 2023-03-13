import { HieroShare } from '../../../libs/fairpool/formulas/models/HieroShare'
import { todo } from '../../../libs/utils/todo'
import { ZeroAddress } from '../../../libs/ethereum/data/allAddresses'
import { bn } from '../../../libs/bn/utils'

export function getRealShareParamsFromModel(hieroShares: HieroShare[]) {
  const shares = hieroShares.map<bigint[]>(todo())
  const controllers = shares.map(paths => paths.map(_ => ZeroAddress))
  const recipients = shares.map(_ => ZeroAddress)
  const gasLimits = shares.map(_ => bn(0))
  return { shares, controllers, recipients, gasLimits }
}
