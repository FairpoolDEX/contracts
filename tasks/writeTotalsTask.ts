import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { toBackendAmountBND } from '../libs/utils/BigNumber/conversions'
import { writeBalancesCSV } from '../utils-local/balance'
import { getRunnableContext, RunnableContext } from '../utils-local/context/getRunnableContext'
import { RunnableTaskArguments } from '../utils-local/RunnableTaskArguments'
import { Writable } from '../utils-local/writable'
import { BalanceBN, validateBalanceBN } from '../models/BalanceBN'
import { Address } from '../models/Address'
import { BusdbnbmainnetContract, BusdEthMainnetContract, ColibnbmainnetContract, ColiEthMainnetContract, DaibnbmainnetContract, DaiEthMainnetContract, UsdcbnbmainnetContract, UsdcEthMainnetContract, UsdtbnbmainnetContract, UsdtEthMainnetContract } from '../data/allTokenInfos'
import { NetworkName, parseNetworkName } from '../libs/ethereum/models/NetworkName'
import { AmountBN, PriceBN } from '../models/AmountBN'
import { BigNumber } from 'ethers'
import { ensure } from '../utils/ensure'
import { TokenInfo } from '../models/TokenInfo'
import { getProvider } from '../utils-local/hardhat'
import { Timestamp } from '../utils-local/types'
import { sum } from '../test/support/all.helpers'
import { getSubmissionsFromCSVFile } from '../models/LearnToEarn/Submission/getSubmissionsFromCSVFile'
import { ten, zero } from '../libs/bn/constants'
import { todo } from 'libs/utils/todo'
import { mapAsync } from '../libs/utils/promise'
import { Filename } from '../libs/utils/filesystem'
import { bn } from '../libs/bn/utils'
import { num } from '../libs/utils/BigNumber/utils'
import { BN } from '../libs/bn'

export async function writeTotalsTask(args: WriteTotalsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getWriteTotalsContext(args, hre)
  const { timestamp } = context
  const networks = ['mainnet', 'bnbmainnet'].map(parseNetworkName)
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
  return mapAsync(addresses, getFrontendTotalsForAddress, networks, context)
}

async function getTeamTotals(leaderAddresses: string[], networks: NetworkName[], context: WriteTotalsContext) {
  return todo<BalanceBN[]>()
}

function getWinningTeam(teamTotals: BalanceBN[]) {
  return todo<Address>()
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
    const tokenFrontendTotals = await mapAsync(tokenInfos, getTokenFrontendTotal, address, networkName, context)
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
function getFrontendTotal(amount: BigNumber, price: BigNumber, multiplier: number, amountDecimals: number, priceDecimals: BN) {
  return amount.mul(multiplier).mul(price).div(ten.pow(amountDecimals)).div(ten.pow(priceDecimals))
}

const priceDecimals = bn(18)

const relevantTokenInfos = [
  ColiEthMainnetContract,
  ColibnbmainnetContract,
  BusdEthMainnetContract,
  BusdbnbmainnetContract,
  UsdcEthMainnetContract,
  UsdcbnbmainnetContract,
  UsdtEthMainnetContract,
  UsdtbnbmainnetContract,
  DaiEthMainnetContract,
  DaibnbmainnetContract,
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

const round1StartedAtbnbmainnetBlockNumber = 16331030

const blockNumberMap = new Map<Timestamp, Map<NetworkName, number>>([
  [round1StartedAtTimestamp, new Map<NetworkName, number>([
    ['mainnet', round1StartedAtMainnetBlockNumber],
    ['bnbmainnet', round1StartedAtbnbmainnetBlockNumber],
  ])],
])

const nativeAssetPriceMap = new Map<number, Map<NetworkName, PriceBN>>([
  [round1StartedAtTimestamp, new Map<NetworkName, PriceBN>([
    // NOTE: getCandleOpenPrice('FTX', round.startedAt, asset)
    ['mainnet', toBackendAmountBND(priceDecimals)(num('3058.5'))],
    ['bnbmainnet', toBackendAmountBND(priceDecimals)(num('411.836'))],
  ])],
])

const tokenPriceMap = new Map<number, Map<string, PriceBN>>([
  [round1StartedAtTimestamp, new Map<string, PriceBN>([
    // NOTE: getCandleOpenPrice('FTX', round.startedAt, asset)
    ['COLI', toBackendAmountBND(priceDecimals)(num('0.00170297'))],
    ['BUSD', toBackendAmountBND(priceDecimals)(num('1'))],
    ['USDT', toBackendAmountBND(priceDecimals)(num('1'))],
    ['USDC', toBackendAmountBND(priceDecimals)(num('1'))],
    ['DAI', toBackendAmountBND(priceDecimals)(num('1'))],
  ])],
])
