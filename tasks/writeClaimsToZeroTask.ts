import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { writeBalances } from '../util/balance'
import { validateWithContext } from '../util/validator'
import { getRewritesFromCSVFile } from '../models/Rewrite/getRewritesFromCSVFile'
import { importDefault } from '../util/import'
import { getClaimsFromRequests, getWriteClaimsContext, WriteClaimsTaskArguments } from './writeClaimsTask'
import { BalanceBN } from '../models/BalanceBN'
import { zero } from '../util/bignumber'

export async function writeClaimsToZeroTask(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getWriteClaimsContext(args, hre)
  const { rewrites: rewritesPath, expectations: expectationsPath, out, log } = context
  // NOTE: Next time execute setClaims manually to avoid changing the owner
  // Contract URL: https://bscscan.com/address/0xEFB7311cc5d66b19FeD6a19148A3Ecf801e65100#writeProxyContract
  const exceptions = ['0x1ed55e06Ca8a6686eB06692676C267cF6Df9D642', '0x01CBb72a9eC45977Ae7A146cC7dbf97AEA31A201']
  const rewrites = await getRewritesFromCSVFile(rewritesPath)
  const validators = await importDefault(expectationsPath)
  const claimsFromRequests = await getClaimsFromRequests(rewrites, context)
  const claimsFromValidation = await validateWithContext(claimsFromRequests, validators, context)
  const claimsFiltered = claimsFromValidation.filter(c => !exceptions.includes(c.address))
  const claims = await setToZero(claimsFiltered)
  await writeBalances(claims, out)
}

async function setToZero(claims: BalanceBN[]): Promise<BalanceBN[]> {
  return claims.map(claim => {
    return ({ ...claim, amount: zero })
  })
}
