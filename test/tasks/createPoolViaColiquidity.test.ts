import { ethers, upgrades } from 'hardhat'
import { BullToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestampForTest, burnRateDenominator, burnRateNumerator, getTestBalanceMap, getTestExpectations } from '../support/BullToken.helpers'
import { BalancesMap, getBalancesFromMap } from '../../util-local/balance'
import { getTestSetClaimsContext } from '../support/context'
import { BalanceBN } from '../../models/BalanceBN'
import { validateAddress } from '../../models/Address'
import { fest } from '../../util-local/mocha'
import { createPoolViaColiquidity, CreatePoolViaColiquidityContext } from '../../tasks/createPoolViaColiquidityTask'
import { getUniswapV2Pair } from '../support/Uniswap.helpers'
import { impl } from '../../util/todo'

describe('createPoolViaColiquidity', async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string
  const aliceAddress = validateAddress('0x00000000000003441d59dde9a90bffb1cd3fabf1')
  const bobAddress = validateAddress('0x7dcbefb3b9a12b58af8759e0eb8df05656db911d')
  const samAddress = validateAddress('0x81dc6f15ee72f6e6d49cb6ca44c0bf8e63770027')
  const calAddress = validateAddress('0xb3b7874f13387d44a3398d298b075b7a3505d8d4')
  const blackAddress = validateAddress('0x011850bf8aeeea25f915d2bc983d5354ccb48836')

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  let balances: BalanceBN[]
  let balancesMap: BalancesMap
  let expectations: SetClaimsExpectationsMap

  before(async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
    // const deployBullTokenResult = await hh(["deployBullToken"])
    // console.log("deployBullTokenResult", deployBullTokenResult)
  })

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners()

    strangerAddress = await stranger.getAddress()
    ownerAddress = await owner.getAddress()

    const bullTokenFactory = await ethers.getContractFactory('BullToken')
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestampForTest, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger)

    balancesMap = await getTestBalanceMap()
    balances = getBalancesFromMap(balancesMap)
    expectations = await getTestExpectations(balances, await getTestSetClaimsContext())
  })

  fest.skip(createPoolViaColiquidity.name, async () => {
    const context = await getCreatePoolViaColiquidityContext()
    const poolAddress = await createPoolViaColiquidity(context)
    const pool = await getUniswapV2Pair(ethers, poolAddress)
    const reserves = await pool.getReserves()
    console.log('reserves', reserves)
    throw impl()
  })

})

async function getCreatePoolViaColiquidityContext(): Promise<CreatePoolViaColiquidityContext> {
  const args = { cacheKey: 'createPool', dry: true }
  throw impl()
  // return {
  //   ...await getRunnableContext(args, hardhatRuntimeEnvironment),
  // }
}
