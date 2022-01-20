import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { BalancesMap, getBalancesFromMap, sumAmountsOf } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { CS, Eddy, KS, oldDeployer, Van1sh } from '../../data/allAddresses'
import { mergeVersionedRecords } from '../../util/version'
import { expectBalancesToMatch, expectUnderTotalAmount } from '../../util/expectation'
import { airdropDistributedTokenAmountTotal, fromShieldToBull } from '../support/BullToken.helpers'
import { share, sumBigNumbers, zero } from '../../util/bignumber'
import { getDistributionBlockNumbers, WriteClaimsValidator } from '../../tasks/writeClaimsTask'
import { ShieldMainnet } from '../../data/allDeployments'
import { Address } from '../../models/Address'
import { Transfer } from '../../models/Transfer'
import { AmountBN } from '../../models/AmountBN'
import { parseTransfersCSV } from '../../models/Transfer/parseTransfersCSV'
import { packageDirectory } from '../../util/pkg-dir'
import { readFile } from 'fs/promises'
import { decimals } from '../support/ColiToken.helpers'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [oldDeployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CS]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [KS]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

const validateBalances: WriteClaimsValidator = async function (claims, context) {
  const expectedBalances = getBalancesFromMap(await getRebrandBalances())
  return expectBalancesToMatch(expectedBalances, claims)
}

const validateTotalAmount: WriteClaimsValidator = async function (claims, context) {
  const expectedTotalAmount = airdropDistributedTokenAmountTotal
  const expectedTotalAmountDelta = share(expectedTotalAmount, 5, 100)
  // NOTE: It will take too much time to calculate the delta precisely
  // const bannedAddressesTokenAmount = todo(BigNumber.from(0))
  // const unclaimedTokenAmount = todo(BigNumber.from(0))
  return expectUnderTotalAmount(expectedTotalAmount, expectedTotalAmountDelta, claims)
}

export default [
  validateBalances,
  validateTotalAmount,
]

const getRebrandBalances = async function (): Promise<BalancesMap> {
  return mergeVersionedRecords([
    // ['1.0.1', {
    //   [KS]: await getKSBalance(),
    // }],
    ['1.0.2', {
      [Van1sh]: await getVan1shBalance(),
    }],
    ['1.0.2', {
      [Eddy]: await getEddyBalance(),
    }],
    ['1.0.5', {
      [CS]: oldBalances[CS].add(virtualSHLDBalancesFromCurrentBullBalances[CS]),
    }],
    ['1.1.0', {
      [oldDeployer]: oldBalances[oldDeployer].add(virtualSHLDBalancesFromCurrentBullBalances[oldDeployer]),
    }],
  ])
}

async function getKSBalance() {
  const transfer19418 = ({ amount: toTokenAmount(19418), createdAt: 'May-27-2021 02:18:15 AM' })
  const transfer66750 = ({ amount: toTokenAmount(66750), createdAt: 'Aug-19-2021 06:00:24 AM' })
  const transfer56700 = ({ amount: toTokenAmount(56700), createdAt: 'Sep-02-2021 11:17:02 AM' })
  const balancesAtDistributionDates = [
    sumAmountsOf([transfer19418]),
    sumAmountsOf([transfer19418]),
    sumAmountsOf([transfer19418]),
    sumAmountsOf([transfer19418, transfer66750, transfer56700]),
    sumAmountsOf([transfer19418, transfer66750, transfer56700]),
  ]
  return fromShieldToBull(sumBigNumbers(balancesAtDistributionDates))
}

async function getVan1shBalance() {
  return getTotalBalanceFromTransfersCSV(Van1sh, new Date('2022-01-20T02:45:11Z'))
}

async function getEddyBalance(): Promise<AmountBN> {
  return getTotalBalanceFromTransfersCSV(Eddy, new Date('2022-01-20T02:55:44Z'))
}

async function getTotalBalanceFromTransfersCSV(address: string, date: Date) {
  const transfers = await getTransfersFriendlyCSV(decimals, ShieldMainnet.address, address, date)
  const balancesAtDistributionDates = await getBalancesAtDistributionDates(address, transfers)
  return fromShieldToBull(sumBigNumbers(balancesAtDistributionDates))
}

async function getTransfersFriendlyCSV(decimals: number, tokenAddress: Address, userAddress: Address, date: Date): Promise<Transfer[]> {
  const data = await readFile(`${await packageDirectory()}/test/transfers/${tokenAddress}/${userAddress}/${date.toISOString()}.csv`)
  return parseTransfersCSV(decimals, data)
}

async function getBalancesAtDistributionDates(address: Address, transfers: Transfer[]): Promise<AmountBN[]> {
  const blockNumbers = await getDistributionBlockNumbers()
  return blockNumbers.map(blockNumber => {
    const transfersUntilDate = transfers.filter(t => t.blockNumber <= blockNumber)
    return getAmountFromTransfers(address, transfersUntilDate)
  })
}

function getAmountFromTransfers(address: Address, transfers: Transfer[]) {
  return transfers.reduce((total, transfer) => {
    switch (true) {
      case transfer.to === address:
        return total.add(transfer.amount)
      case transfer.from === address:
        return total.sub(transfer.amount)
      default:
        throw new Error()
    }
  }, zero)
}
