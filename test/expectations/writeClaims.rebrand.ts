import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { BalancesMap, getBalancesFromMap, sumAmountsOf } from '../../util-local/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { CS, Eddy, isBullSellerAddress, Jordan, KS, newHardwareDeployer, NFTradePool, oldSoftwareDeployer, Van1sh } from '../../data/allAddresses'
import { mergeVersionedRecords } from '../../util-local/version'
import { expectBalancesToMatch, expectUnderTotalAmount } from '../../util-local/expectation'
import { airdropDistributedTokenAmountTotal, airdropDistributionDates, bullDecimals, fromShieldToBull } from '../support/BullToken.helpers'
import { getShare, sumBigNumbers, zero } from '../../util/bignumber'
import { getDistributionBlockNumbers, WriteClaimsValidator } from '../../tasks/writeClaimsTask'
import { ColiMainnet } from '../../data/allDeployments'
import { Address } from '../../models/Address'
import { Transfer } from '../../models/Transfer'
import { AmountBN } from '../../models/AmountBN'
import { parseTransfersCSV } from '../../models/Transfer/parseTransfersCSV'
import { readFile } from 'fs/promises'
import { shieldDecimals } from '../support/ColiToken.helpers'
import { parseEtherscanAmountCSV } from '../../models/AmountBN/parseEtherscanAmountCSV'
import { expect } from '../../util-local/expect'
import { ensure } from '../../util/ensure'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [oldSoftwareDeployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CS]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [KS]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

const validateRewrites: WriteClaimsValidator = async function (claims, context) {
  const oldSoftwareDeployerClaim = claims.find(c => c.address === oldSoftwareDeployer)
  const newHardwareDeployerClaim = claims.find(c => c.address === newHardwareDeployer)
  expect(oldSoftwareDeployerClaim).not.to.exist
  expect(newHardwareDeployerClaim).to.exist
  return claims
}

const validateWithJordan: WriteClaimsValidator = async function (claims, context) {
  const JordanClaim = ensure(claims.find(c => c.address === Jordan))
  expect(JordanClaim.amount).to.be.gt(fromShieldToBull(getJordanBalanceOfShieldToken()))
  return claims
}

const validateBalances: WriteClaimsValidator = async function (claims, context) {
  const expectedBalances = getBalancesFromMap(await getRebrandBalances())
  return expectBalancesToMatch(expectedBalances, claims)
}

const validateTotalAmount: WriteClaimsValidator = async function (claims, context) {
  const expectedTotalAmount = airdropDistributedTokenAmountTotal
  const expectedTotalAmountDelta = getShare(expectedTotalAmount, 5, 100)
  // NOTE: It will take too much time to calculate the delta precisely
  // const bannedAddressesTokenAmount = todo(BigNumber.from(0))
  // const unclaimedTokenAmount = todo(BigNumber.from(0))
  return expectUnderTotalAmount(expectedTotalAmount, expectedTotalAmountDelta, claims)
}

export default [
  validateRewrites,
  validateWithJordan,
  validateBalances,
  validateTotalAmount,
]

const getRebrandBalances = async function (): Promise<BalancesMap> {
  return mergeVersionedRecords([
    ['1.0.1', {
      [KS]: await getKSBalance(),
    }],
    ['1.0.2', {
      [Eddy]: await getEddyBalance(),
    }],
    ['1.0.3', {
      [Van1sh]: await getVan1shBalance(),
    }],
    ['1.0.5', {
      [CS]: oldBalances[CS].add(virtualSHLDBalancesFromCurrentBullBalances[CS]),
    }],
    ['1.1.0', {
      [oldSoftwareDeployer]: oldBalances[oldSoftwareDeployer].add(virtualSHLDBalancesFromCurrentBullBalances[oldSoftwareDeployer]),
    }],
  ])
}

function getKSTransferDummies() {
  const transfer19418 = ({ amount: toTokenAmount(19418), createdAt: 'May-27-2021 02:18:15 AM' })
  const transfer66750 = ({ amount: toTokenAmount(66750), createdAt: 'Aug-19-2021 06:00:24 AM' })
  const transfer56700 = ({ amount: toTokenAmount(56700), createdAt: 'Sep-02-2021 11:17:02 AM' })
  return { transfer19418, transfer66750, transfer56700 }
}

export async function getKSAmountFromBullToken() {
  const { transfer19418, transfer66750, transfer56700 } = getKSTransferDummies()
  return fromShieldToBull(transfer19418.amount)
}

async function getKSBalance() {
  const { transfer19418, transfer66750, transfer56700 } = getKSTransferDummies()
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

async function getTotalBalanceFromTransfersCSV(address: Address, date: Date) {
  if (isBullSellerAddress(address)) return zero
  const totalBalanceFromBull = await getBullBalanceAt(address, airdropDistributionDates[0])
  const transfers = await getTransfersFromCSVFile(shieldDecimals, ColiMainnet.address, address, date)
  const balancesAtDistributionDates = await getBalancesAtDistributionDates(address, transfers)
  const totalBalanceFromShield = fromShieldToBull(sumBigNumbers(balancesAtDistributionDates))
  return totalBalanceFromBull.add(totalBalanceFromShield)
}

async function getBullBalanceAt(address: Address, date: Date) {
  switch (date.toISOString()) {
    case '2021-06-04T13:00:00.000Z':
      switch (address) {
        case Van1sh:
          return parseEtherscanAmountCSV(bullDecimals, '679,681.004489999091713627')
        default:
          throw new Error()
      }
    default:
      throw new Error()
  }
}

async function getTransfersFromCSVFile(decimals: number, tokenAddress: Address, userAddress: Address, date: Date): Promise<Transfer[]> {
  const data = await readFile(`${process.cwd()}/test/transfers/${tokenAddress}/${userAddress}/${date.toISOString()}.csv`)
  return parseTransfersCSV(decimals, data)
}

async function getBalancesAtDistributionDates(address: Address, transfers: Transfer[]): Promise<AmountBN[]> {
  const blockNumbers = await getDistributionBlockNumbers()
  return blockNumbers.map(blockNumber => {
    const transfersUntilBlockNumber = transfers.filter(t => t.blockNumber <= blockNumber)
    return getAmountFromTransfers(address, transfersUntilBlockNumber)
  })
}

function getAmountFromTransfers(address: Address, transfers: Transfer[]) {
  return transfers.reduce((total, transfer) => {
    switch (true) {
      case transfer.to === address:
        if (unwrappedSmartContractAddresses.includes(transfer.from)) {
          return total
        } else {
          return total.add(transfer.amount)
        }
      case transfer.from === address:
        if (unwrappedSmartContractAddresses.includes(transfer.to)) {
          return total
        } else {
          return total.sub(transfer.amount)
        }
      default:
        throw new Error()
    }
  }, zero)
}

export const unwrappedSmartContractAddresses = [NFTradePool]

export function getJordanBalanceOfShieldToken() {
  return parseEtherscanAmountCSV(shieldDecimals, '1,376,074.28341982065565036')
}
