import { ethers, upgrades } from 'hardhat'
import { toTokenAmount } from '../support/all.helpers'
import { addLiquidity, timeTravel } from '../support/test.helpers'
import { BullToken, QuoteToken, UniswapV2Factory, UniswapV2Router02, WETH9 } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { setClaims, SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestampForTest, burnRateDenominator, burnRateNumerator, getTestAddresses, getTestBalanceMap, getTestExpectations, setDefaultAmounts } from '../support/BullToken.helpers'
import { claimMany } from '../../tasks/claimManyTask'
import { Contract, ContractFactory } from 'ethers'
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory } from '../support/Uniswap.helpers'
import { BalancesMap, getBalancesFromMap } from '../../util/balance'
import { Address } from '../../models/Address'
import { getTestSetClaimsContext } from '../support/context'
import { BalanceBN } from '../../models/BalanceBN'
import { fest } from '../../util/mocha'

xdescribe('rollbackBullToken', async () => {
  let bullTokenFactory: ContractFactory

  let owner: SignerWithAddress, stranger: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, sam: SignerWithAddress
  let bullTokenWithOwner: BullToken, bullTokenWithStranger: BullToken, bullTokenWithAlice: BullToken, bullTokenWithBob: BullToken, bullTokenWithSam: BullToken

  let balancesMap: BalancesMap
  let balances: BalanceBN[]
  let addresses: Address[]
  let expectations: SetClaimsExpectationsMap

  const defaultAmount = toTokenAmount('10000')

  const airdropFirstTimestamp = airdropStartTimestampForTest
  const airdropSecondTimestamp = airdropStartTimestampForTest + airdropStageDuration

  let uniswapV2Factory: UniswapV2Factory
  let uniswapV2Router: UniswapV2Router02
  let weth: WETH9
  let quoteTokenWithOwner: QuoteToken

  before(async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
    // const deployBullTokenResult = await hh(["deployBullToken"])
    // console.log("deployBullTokenResult", deployBullTokenResult)
  })

  beforeEach(async () => {
    [owner, stranger, alice, bob, sam] = await ethers.getSigners()

    bullTokenFactory = await ethers.getContractFactory('BullToken')
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestampForTest, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger) as BullToken
    bullTokenWithAlice = bullTokenWithOwner.connect(alice)
    bullTokenWithBob = bullTokenWithOwner.connect(bob)
    bullTokenWithSam = bullTokenWithOwner.connect(sam)

    addresses = await getTestAddresses()
    balancesMap = await setDefaultAmounts(await getTestBalanceMap(), addresses, defaultAmount)
    balances = getBalancesFromMap(balancesMap)
    expectations = await getTestExpectations(balances, await getTestSetClaimsContext())
    await setClaims(bullTokenWithOwner, balances, await getTestSetClaimsContext())

    const quoteTokenFactory = await ethers.getContractFactory('QuoteToken')
    quoteTokenWithOwner = await quoteTokenFactory.deploy() as QuoteToken

    const wethContractFactory = await getWETH9ContractFactory(ethers)
    weth = await wethContractFactory.deploy() as WETH9

    const UniswapV2FactoryContractFactory = await getUniswapV2FactoryContractFactory(ethers)
    uniswapV2Factory = await UniswapV2FactoryContractFactory.deploy(owner.address) as UniswapV2Factory

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    uniswapV2Router = await UniswapV2Router02ContractFactory.deploy(uniswapV2Factory.address, weth.address) as UniswapV2Router02
  })

  // https://www.dextools.io/app/uniswap/pair-explorer/0x59b8c20ca527ff18e2515b68f28939d6dd3e867b
  // https://etherscan.io/address/0x1bb022ab668085c6417b7d7007b0fbd53bacc383
  fest('should download marked transfers', async () => {
    await timeTravel(async () => {
      await claimMany(bullTokenWithStranger, addresses, ethers)
      await claimMany(bullTokenWithAlice, addresses, ethers)
      const pair = await deployUniswapPair(uniswapV2Factory, bullTokenWithOwner as Contract, quoteTokenWithOwner as Contract, ethers)

      await bullTokenWithStranger.transfer(alice.address, toTokenAmount('10'))
      await bullTokenWithAlice.transfer(stranger.address, toTokenAmount('5'))

      await addLiquidity(uniswapV2Router, bullTokenWithOwner as Contract, quoteTokenWithOwner as Contract, toTokenAmount('10000000'), toTokenAmount('20000'), owner.address)

      // const { moves, buys, sells } = await getTransferSet(deployedAddress)
      //
      // expect(moves.length).to.be.greaterThan(1)
      // expect(moves).to.contain("https://etherscan.io/tx/0x062cc15e48c0bb0f0716e621aee83f583aa181ee5cd23136be90ade315ca351f#eventlog")
      //
      // expect(sells.length).to.be.greaterThan(1)
      // expect(sells).to.contain("https://etherscan.io/tx/0x583dab1745243b7b7e55b7eaffdfe684bae7c27dc3a55d6c50a4de9786f941ea")
      //
      // expect(buys.length).to.be.greaterThan(1)
      // expect(buys).to.contain("https://etherscan.io/tx/0x8c9e3365739d07718adc730fc4e30080c862e21b3101e4c13f36d19bc842d4e2")
    }, airdropFirstTimestamp)
  })

  fest('should allow to claim the tokens', async () => {
    // TODO: Sells and buys should only be reflected on the next airdrop
    await timeTravel(async () => {
      await claimMany(bullTokenWithStranger, addresses, ethers)
      await claimMany(bullTokenWithAlice, addresses, ethers)
      await timeTravel(async () => {
        await bullTokenWithStranger.claim()
        const pair = await deployUniswapPair(uniswapV2Factory, bullTokenWithOwner as Contract, quoteTokenWithOwner as Contract, ethers)
        // await sell(bullTokenWithStranger, pair)
        // await sell(bullTokenWithAlice, pair)
        // await buy(bullTokenWithBob, pair)
        // await sell(bullTokenWithAlice, pair)
        // await revert(bullTokenWithOwner, pair, airdropSecondTimestamp)
        // await sync(pair)
        // expect(newBalances).deep.equal(oldBalances)
        // expect(canBuy(bullTokenWithStranger, pair))
        // expect(canSell(bullTokenWithStranger, pair))
        // expect(canTransfer(bullTokenWithStranger))
      }, airdropSecondTimestamp)
    }, airdropFirstTimestamp)
  })

})

// async function sell(token: BullToken, pair: Contract) {
//
// }
//
// async function buy(token: BullToken, pair: Contract) {
//
// }
//
// async function revert(token: BullToken, pair: Contract, timestamp: number) {
//
// }
//
// async function sync(pair: Contract) {
//
// }
