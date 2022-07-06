import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { writeBalancesCSV } from '../util-local/balance'
import { getRunnableContext, RunnableContext } from '../util-local/context/getRunnableContext'
import { RunnableTaskArguments } from '../util-local/RunnableTaskArguments'
import { Writable } from '../util-local/writable'
import { BalanceBN, validateBalanceBN } from '../models/BalanceBN'
import { Filename } from '../util/filesystem'
import { Address } from '../models/Address'
import { BusdBscMainnetContract, BusdEthMainnetContract, ColiBscMainnetContract, ColiEthMainnetContract, DaiBscMainnetContract, DaiEthMainnetContract, UsdcBscMainnetContract, UsdcEthMainnetContract, UsdtBscMainnetContract, UsdtEthMainnetContract } from '../data/allTokenInfos'
import { NetworkName, validateNetworkName } from '../models/NetworkName'
import { parMap } from '../util/promise'
import { ten, zero } from '../util/bignumber'
import { AmountBN, PriceBN } from '../models/AmountBN'
import { BigNumber } from 'ethers'
import { GenericToken } from '../typechain-types'
import { toBackendAmountBN } from '../util-local/bignumber.convert'
import { ensure } from '../util/ensure'
import { TokenInfo } from '../models/TokenInfo'
import { getProvider } from '../util-local/hardhat'
import { Timestamp } from '../util-local/types'
import { sum } from '../test/support/all.helpers'
import { getSubmissionsFromCSVFile } from '../models/LearnToEarn/Submission/getSubmissionsFromCSVFile'
import { stub } from '../util/todo'

export async function writeTotalsTask(args: WriteTotalsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getWriteTotalsContext(args, hre)
  const { timestamp } = context
  const networks = ['mainnet', 'bscmainnet'].map(validateNetworkName)
  const { submissions: submissionsPath, out, log } = context
  const submissions = await getSubmissionsFromCSVFile(submissionsPath)
  const playerAddresses = submissions.map(s => s.playerAddress)
  const leaderAddresses = submissions.map(s => s.leaderAddress)
  const playerTotals = await getPlayerTotals(playerAddresses, networks, context)
  const teamTotals = await getTeamTotals(leaderAddresses, networks, context)
  // TODO:
  // const winningLeaderAddress = getWinningTeam(teamTotals)
  // const filteredPlayerTotals = playerTotals.filter(t => t.leaderAddress = winningLeaderAddress)
  // const winningPlayerAddress = getWinningPlayer(filteredPlayerTotals)
  await writeBalancesCSV(playerTotals, out)
}

export interface WriteTotalsTaskArguments extends RunnableTaskArguments, Writable {
  timestamp: Timestamp
  submissions: Filename
}

export interface WriteTotalsContext extends WriteTotalsTaskArguments, RunnableContext {
  // getNativeAssetPriceAtBlockNumber: (networkName: NetworkName, blockNumber: number) => Promise<AmountBN>
  // getTokenPriceAtBlockNumber: (networkName: NetworkName, tokenAddress: Address, blockNumber: number) => Promise<AmountBN>
}

export async function getWriteTotalsContext(args: WriteTotalsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<WriteTotalsContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}

async function getPlayerTotals(addresses: Address[], networks: NetworkName[], context: WriteTotalsContext): Promise<BalanceBN[]> {
  return parMap(addresses, getFrontendTotalsForAddress, networks, context)
}

async function getTeamTotals(leaderAddresses: string[], networks: NetworkName[], context: WriteTotalsContext) {
  return stub<BalanceBN[]>()
}

function getWinningTeam(teamTotals: BalanceBN[]) {
  return stub<Address>()
}

async function getFrontendTotalsForAddress(address: Address, networks: NetworkName[], context: WriteTotalsContext) {
  const amount = await networks.reduce(async (total, networkName) => {
    const { timestamp } = context
    const provider = await getProvider(context)(networkName)
    const blockNumber = await getBlockNumber(timestamp, networkName)
    const nativeAssetBalance = await provider.getBalance(address, blockNumber)
    const nativeAssetPrice = await getNativeAssetPrice(timestamp, networkName)
    const nativeAssetDecimals = 18 // should be the same for every EVM-compatible blockchain
    const nativeAssetFrontendTotal = getFrontendTotal(nativeAssetBalance, nativeAssetPrice, 1, nativeAssetDecimals, priceDecimals)
    const tokenInfos = relevantTokenInfos.filter(ti => ti.network === networkName)
    const tokenFrontendTotals = await parMap(tokenInfos, getTokenFrontendTotal, address, networkName, context)
    const tokenFrontendTotalsSum = sum(tokenFrontendTotals)
    return (await total).add(nativeAssetFrontendTotal.add(tokenFrontendTotalsSum))
  }, Promise.resolve(zero))
  return validateBalanceBN({ address, amount })
}

async function getTokenFrontendTotal(tokenInfo: TokenInfo, userAddress: Address, networkName: NetworkName, context: WriteTotalsContext) {
  const { ethers, timestamp } = context
  const { multiplier, address } = tokenInfo
  const provider = await getProvider(context)(networkName)
  const signer = provider.getSigner(await context.signer.getAddress())
  const tokenRaw = await ethers.getContractFactory('GenericToken', { signer })
  const token = tokenRaw.attach(address)
  const balance = await token.balanceOf(userAddress)
  const price = await getTokenPrice(timestamp, networkName, tokenInfo)
  const decimals = await token.decimals()
  return getFrontendTotal(balance, price, multiplier, decimals, priceDecimals)
}

/**
 * WARNING: This function truncates the fractional part of the total
 */
function getFrontendTotal(amount: BigNumber, price: BigNumber, multiplier: number, amountDecimals: number, priceDecimals: number) {
  return amount.mul(multiplier).mul(price).div(ten.pow(amountDecimals)).div(ten.pow(priceDecimals))
}

const priceDecimals = 18

const relevantTokenInfos = [
  ColiEthMainnetContract,
  ColiBscMainnetContract,
  BusdEthMainnetContract,
  BusdBscMainnetContract,
  UsdcEthMainnetContract,
  UsdcBscMainnetContract,
  UsdtEthMainnetContract,
  UsdtBscMainnetContract,
  DaiEthMainnetContract,
  DaiBscMainnetContract,
]

async function getBlockNumber(timestamp: Timestamp, networkName: NetworkName) {
  // NOTE: "The snapshot for capital calculation is taken on the next block after the round starts." This is important for whales who can withdraw & re-deposit to show their capital
  const map = ensure(blockNumberMap.get(timestamp))
  return ensure(map.get(networkName))
}

async function getNativeAssetPrice(timestamp: Timestamp, networkName: NetworkName): Promise<AmountBN> {
  const networkNamePriceMap = ensure(nativeAssetPriceMap.get(timestamp))
  return ensure(networkNamePriceMap.get(networkName))
}

async function getTokenPrice(timestamp: Timestamp, networkName: NetworkName, tokenInfo: TokenInfo): Promise<AmountBN> {
  const tokenMap = ensure(tokenPriceMap.get(timestamp))
  return ensure(tokenMap.get(tokenInfo.symbol))
}

const round1StartedAtTimestamp = new Date('2022-03-24T07:00:00Z').getTime()

const round1StartedAtMainnetBlockNumber = 14450739

const round1StartedAtBscmainnetBlockNumber = 16331030

const blockNumberMap = new Map<Timestamp, Map<NetworkName, number>>([
  [round1StartedAtTimestamp, new Map<NetworkName, number>([
    ['mainnet', round1StartedAtMainnetBlockNumber],
    ['bscmainnet', round1StartedAtBscmainnetBlockNumber],
  ])],
])

const nativeAssetPriceMap = new Map<number, Map<NetworkName, PriceBN>>([
  [round1StartedAtTimestamp, new Map<NetworkName, PriceBN>([
    // NOTE: getCandleOpenPrice('FTX', round.startedAt, asset)
    ['mainnet', toBackendAmountBN('3058.5', priceDecimals)],
    ['bscmainnet', toBackendAmountBN('411.836', priceDecimals)],
  ])],
])

const tokenPriceMap = new Map<number, Map<string, PriceBN>>([
  [round1StartedAtTimestamp, new Map<string, PriceBN>([
    // NOTE: getCandleOpenPrice('FTX', round.startedAt, asset)
    ['COLI', toBackendAmountBN('0.00170297', priceDecimals)],
    ['BUSD', toBackendAmountBN('1', priceDecimals)],
    ['USDT', toBackendAmountBN('1', priceDecimals)],
    ['USDC', toBackendAmountBN('1', priceDecimals)],
    ['DAI', toBackendAmountBN('1', priceDecimals)],
  ])],
])
