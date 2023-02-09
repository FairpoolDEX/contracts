import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot, timeTravel } from '../support/test.helpers'
import { Fairpool } from '../../typechain-types'
import { $zero } from '../../data/allAddresses'
import { BigNumber } from 'ethers'
import { fest } from '../../utils-local/mocha'
import { mainnet } from '../../libs/ethereum/data/allNetworks'
import { assumeIntegerEnvVar } from '../../utils/env'
import { expect } from '../../utils-local/expect'
import { mapAsync, repeatAsync, sequentialMap } from 'libs/utils/promise'
import { range } from 'remeda'
import { Address } from '../../models/Address'
import { getSignatures } from '../../utils-local/getSignatures'
import { getGasUsedForManyHolders } from './Fairpool/getGasUsedForManyHolders'
import { deployFairpoolTest } from './Fairpool/deployFairpoolTest'
import { Rewrite } from '../../libs/utils/rewrite'
import { parseTransactionInfo } from '../../libs/echidna/parseTransactionInfo'
import { executeTransaction } from '../../libs/echidna/executeTransaction'
import { bn, sumBNs } from '../../libs/bn/utils'
import { buy, getBalances, getSupplyStats, sell, selloff, subSupplyStats, zeroSupplyStats } from '../support/Fairpool.functions'
import { expectParameter } from './Fairpool/expectParameter'
import { getCsvStringifier } from '../../libs/utils/csv'
import { getDebug, isEnabledLog } from '../../libs/utils/debug'
import { pipeline } from '../../libs/utils/stream'
import { ensureQuoteDeltaMin, quoteDeltaMinStatic } from '../support/Fairpool.helpers'
import { cleanEchidnaLogString, filterEchidnaLogString } from '../../utils-local/cleanEchidnaLogString'
import { parseTradeEvent, TradeEventTopic } from '../../libs/fairpool/models/TradeEvent'
import { fromRawEvent } from '../../utils-local/fromRawEvent'
import { createWriteStream } from 'fs'
import { withCleanEthersError } from '../../utils-local/ethers/withCleanEthersError'
import { BaseScale, DefaultSlope, DefaultWeight, QuoteDecimals, QuoteScale } from '../../libs/fairpool/constants'
import { sumFees } from '../../utils-local/ethers/sumFees'
import { getContractBalance } from '../../utils-local/ethers/getContractBalance'
import { zero } from '../../libs/bn/constants'
import { BN } from '../../libs/bn'
import { AmountBN } from '../../libs/ethereum/models/AmountBN'
import { fromTradeEventPairToCsv, tradeEventPairCsvColumns } from '../../libs/fairpool/models/TradeEvent/fromTradeEventToCsv'
import { toPrevNextMaybePairs } from '../../libs/generic/models/PrevNext/toPrevNextMaybePairs'
import { getSharePercent, getWeightPercent } from '../../libs/fairpool/utils'

describe('Fairpool', async function () {
  let signers: SignerWithAddress[]
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let ben: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let sally: SignerWithAddress
  let ted: SignerWithAddress
  let operator: SignerWithAddress

  let fairpool: Fairpool
  let fairpoolAsOwner: Fairpool
  let fairpoolAsSam: Fairpool
  let fairpoolAsBob: Fairpool
  let fairpoolAsSally: Fairpool
  let fairpoolAsOperator: Fairpool

  let now: Date

  let snapshot: unknown

  let slope: BigNumber
  let weight: BigNumber
  let royalties: BigNumber
  let earnings: BigNumber
  // let jump: number
  // let denominator: number

  const debug = getDebug(__filename)

  /**
   * TODO: Tests
   *
   * Must give a reason to deploy the contract
   * Must give a reason to promote the contract
   * Must give a reason to buy & hold the token
   * Must give a reason to speculate on the token
   *  - Given by a reason to buy & hold the token
   * Must allow to buy the token now & sell later at a higher price.
   * Must allow the creator to receive royalties without paying anything.
   * Must allow multiple fee recipients
   * Must not allow the fees sum to be higher or equal to 100%.
   * Must not allow to remove the author from the list of beneficiaries
   * Must allow beneficiaries to adjust to meta-market conditions
   * Must allow beneficiaries to change the spread, jump
   * Must not allow beneficiaries to rug-pull
   *  Must not allow beneficiaries to adjust parameters in an "unfair" way
   *    Must not allow to increase the jump so much that a single sell will bring the price down a lot
   * May allow gradual change of parameters?
   *  May allow dynamic adjustment over time
   *    * setJump(uint _value, uint _period) -> linearly extrapolate the current value of jump, set minimum period
   * Must not allow beneficiaries to withdraw the money
   * Must not allow beneficiaries to change the price
   * Must not allow author to change pool parameters
   * Must not allow arithmetic overflows
   *
   * Must protect from the frontrunning bots
   * - But who's going to frontrun a large margin?
   *   - But the average margin may decrease over time
   *   - But the speed may be high enough to warrant frontrunning
   * - May allow to specify minTokenAmount (~ allowed slippage)
   *
   * Must allow to add a new beneficiary
   *  * Must require that sum of fees does not change
   *  * Must remove the old beneficiary if the new beneficiary has 100% of the fee of the old beneficiary
   *  * Must reduce without assignment if the new beneficiary is zero address
   * Must allow to change the address of the current beneficiary
   *  * Must use the addBeneficiary method with 100% of the current fee
   * Must allow to reduce the fee of the current beneficiary
   *  * Must use the addBeneficiary method with zero address
   */

  before(async () => {
    signers = [owner, stranger, ben, bob, sam, ted, sally, operator] = await ethers.getSigners()

    const fairpoolFactory = await ethers.getContractFactory('FairpoolOwnerOperator')
    slope = DefaultSlope
    weight = DefaultWeight
    royalties = getSharePercent(30)
    earnings = getSharePercent(20)
    fairpoolAsOwner = (await fairpoolFactory.connect(owner).deploy(
      'Abraham Lincoln Token',
      'ABRA',
      slope,
      weight,
      royalties,
      earnings,
      [ben.address, bob.address],
      [getSharePercent(12), getSharePercent(88)]
    )) as unknown as Fairpool
    fairpool = fairpoolAsOwner.connect($zero)
    fairpoolAsBob = fairpool.connect(bob)
    fairpoolAsSam = fairpool.connect(sam)
    fairpoolAsSally = fairpool.connect(sally)
    fairpoolAsOperator = fairpool.connect(operator)

    await fairpoolAsOwner.setOperator(operator.address)

    // denominator = fairpool.denominator()
    // bid = await fairpoolAsBob.bid()
    // jump = await fairpoolAsBob.jump()

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  async function unsetTaxes() {
    await fairpoolAsOwner.setRoyalties(0)
    await fairpoolAsOwner.setEarnings(0)
    await fairpoolAsOperator.setFees(0)
  }

  /**
   * @see getQuoteDeltaMinTask
   */

  fest.skip('must provide a higher profit at a higher price', async () => {
    const getBobProfit = (sallyAmount: AmountBN, bobAmount: AmountBN, samAmount: AmountBN) => async () => {
      const quoteBalanceBefore = await bob.getBalance()
      const baseBalances = await mapAsync([sally, bob, sam], signer => fairpool.balanceOf(signer.address))
      await buy(fairpool, sally, sallyAmount)
      await buy(fairpool, bob, bobAmount)
      await buy(fairpool, sam, samAmount)
      await selloff(fairpool, bob)
      const quoteBalanceAfter = await bob.getBalance()
      return quoteBalanceAfter.sub(quoteBalanceBefore)
    }
    const bobProfitAt1 = await timeTravel(getBobProfit(QuoteScale.mul(1), QuoteScale, QuoteScale.mul(100)), now.getTime() + 2)
    const bobProfitAt100 = await timeTravel(getBobProfit(QuoteScale.mul(100), QuoteScale, QuoteScale.mul(100)), now.getTime() + 2)
    // console.log('bobProfitAt1', bobProfitAt1)
    // console.log('bobProfitAt100', bobProfitAt100)
    // Negative profit may arise due to taxes
    const profit = bobProfitAt100.sub(bobProfitAt1)
    // console.log('profit', profit)
    expect(bobProfitAt100).to.be.greaterThan(bobProfitAt1)
  })

  fest('must keep quoteDeltaMin small', async () => {
    await ensureQuoteDeltaMin(fairpool, bob, sam)
  })

  fest('must keep the sell() transaction under block gas limit', async () => {
    const { blockGasLimit } = mainnet
    const maxHoldersCount = assumeIntegerEnvVar('MAX_HOLDER_COUNT', 500)
    const gasUsed = await getGasUsedForManyHolders(fairpool, owner, maxHoldersCount)
    expect(gasUsed).to.be.lte(blockGasLimit / 10)
  })

  fest('must allow the short cycle', async () => {
    await unsetTaxes()
    const before = await getBalances(fairpool, bob)
    const quoteDelta = quoteDeltaMinStatic
    const buyTx = await buy(fairpool, bob, quoteDelta)
    const contractQuoteBalanceExternalAfterBuy = await getContractBalance(fairpool)
    const contractQuoteBalanceInternalAfterBuy = await fairpool.quoteBalanceOfContract()
    expect(quoteDelta).to.equal(contractQuoteBalanceExternalAfterBuy)
    expect(quoteDelta).to.equal(contractQuoteBalanceInternalAfterBuy)
    const during = await getBalances(fairpool, bob)
    const baseDelta = await fairpool.balanceOf(bob.address)
    const sellTx = await sell(fairpool, bob, baseDelta)
    const after = await getBalances(fairpool, bob)
    const fees = await sumFees([buyTx, sellTx])
    const contractQuoteBalanceExternalAfterSell = await getContractBalance(fairpool)
    /**
     * sell() calls withdraw(), so the contract must be drained
     */
    expect(contractQuoteBalanceExternalAfterSell).to.eq(zero)
    const afterWithFeesAndContractBalance = { ...after, quote: after.quote.add(fees).add(contractQuoteBalanceExternalAfterSell) }
    expect(before).to.deep.equal(afterWithFeesAndContractBalance)
  })

  fest('must replay Echidna transactions', withCleanEthersError(async () => {
    const echidnaLog = `
      setCurveParameters(100000000000001,499999) from: 0x0000000000000000000000000000000000030000 Time delay: 423152 seconds Block delay: 6721
      test() from: 0x0000000000000000000000000000000000030000
      // // setCurveParameters(200000000000000000000,982081) from: 0x0000000000000000000000000000000000030000 Time delay: 423152 seconds Block delay: 6721
      buy(33,91771647390517348682355901009075223511980491153039051186838984108843927034499) from: 0x0000000000000000000000000000000000010000 Value: 0x2997bfe89ef417b83 Time delay: 150943 seconds Block delay: 15627
      buy(13,40006280830262897942042416864167850074511856115222124081697447264565371730107) from: 0x0000000000000000000000000000000000020000 Value: 0x29243a2695d73f60f Time delay: 298373 seconds Block delay: 5728
    `
    const echidnaLines = echidnaLog.split('\n').map(cleanEchidnaLogString).filter(filterEchidnaLogString)
    const fairpoolTest = await deployFairpoolTest(owner)
    const signatures = getSignatures(fairpoolTest.interface.functions)
    const rewrites: Rewrite<Address>[] = [
      { from: '0x0000000000000000000000000000000000030000', to: owner.address },
      { from: '0x0000000000000000000000000000000000020000', to: bob.address },
      { from: '0x0000000000000000000000000000000000010000', to: ben.address },
      { from: '0x00a329c0648769a73afac7f9381e08fb43dbea72', to: fairpoolTest.address },
    ]
    const infos = echidnaLines.map(parseTransactionInfo(signatures, rewrites))
    const results = await sequentialMap(infos, executeTransaction(fairpoolTest, signers))
    const $AssertionFailed = 'AssertionFailed'
    const failedTx = results.find(({ logs }) => logs.find(l => l.name === $AssertionFailed))
    if (failedTx) throw new Error($AssertionFailed)
  }))

  fest('quoteDeltaMinProposed', async () => {
    const quoteDeltaMinProposed = quoteDeltaMinStatic
    // first transaction should be reverted
    await expect(buy(fairpool, bob, quoteDeltaMinProposed.div(2))).to.be.revertedWithCustomError(fairpool, 'QuoteDeltaMustBeGreaterThanOrEqualTo2xScaleOfShares')
    // console.log('balance 1', await fairpool.balanceOf(bob.address))
    // second transaction should be accepted
    await buy(fairpool, bob, quoteDeltaMinProposed)
    // console.log('balance 2', await fairpool.balanceOf(bob.address))
    await buy(fairpool, bob, QuoteScale.mul(100))
    // third transaction should be accepted also, even though the totalSupply() has increased
    await buy(fairpool, bob, quoteDeltaMinProposed)
  })

  /**
   * Weird: according to equations, the curve parameters must matter
   * - (q = b ^ 2 / 2)[https://quickmath.com/webMathematica3/quickmath/equations/solve/advanced.jsp#c=solve_solveequationsadvanced&v1=x%2520%253D%2520%2528a%2520%255E%25202%2529%2520%2F%25202%250Ay%2520%253D%2520%2528b%2520%255E%25202%2529%2520%2F%25202%250Az%2520%253D%2520%2528c%2520%255E%25202%2529%2520%2F%25202%250Ac%2520%253D%2520a%2520%2B%2520b%250Ap%2520%253D%2520z%2520-%2520y%250Ax%2520%253D%25201%250Az%2520%253D%252010%2520*%2520x%250A&v2=x%250Ay%250Az%250Aa%250Ab%250Ac%250Ap&v3=1&v4=3&v5=1]
   * - (q = b ^ 3 / 3)[https://quickmath.com/webMathematica3/quickmath/equations/solve/advanced.jsp#c=solve_solveequationsadvanced&v1=x%2520%253D%2520%2528a%2520%255E%25203%2529%2520%2F%25203%250Ay%2520%253D%2520%2528b%2520%255E%25203%2529%2520%2F%25203%250Az%2520%253D%2520%2528c%2520%255E%25203%2529%2520%2F%25203%250Ac%2520%253D%2520a%2520%2B%2520b%250Ap%2520%253D%2520z%2520-%2520y%250Ax%2520%253D%25201%250Az%2520%253D%252010%2520*%2520x%250A&v2=x%250Ay%250Az%250Aa%250Ab%250Ac%250Ap&v3=1&v4=3&v5=1]
   *   - Scroll down (only the last solution is in real numbers)
   * Most likely, since the quoteBuffer is calculated dynamically, it eventually calculates back to the same curve
   */
  fest('curve parameters must not matter for profit', async () => {
    const bobAmount = QuoteScale
    const samAmount = QuoteScale.mul(1000)
    const profits = await Promise.all([
      getProfit(slope, weight, owner, bob, sam, bobAmount, samAmount),
      getProfit(slope.mul(1000), weight, owner, bob, sam, bobAmount, samAmount),
      getProfit(slope, getWeightPercent(49), owner, bob, sam, bobAmount, samAmount),
    ])
    // console.log('profit', toFrontendQuoteScale(profits[0]).toString())
    profits.forEach(profit => expect(profit).to.equal(profits[0]))
  })

  /**
   * NOTE: The user receives higher baseSupply from a single big buy tx than from multiple small buy txes (even if he spends the same quoteSupply)
   * Most likely it's caused by rounding in the power() function
   */
  fest('buys must be almost additive', async () => {
    await unsetTaxes()
    // await fairpoolAsOwner.setCurveParameters(bn('5079110400'), bn('982081'))
    const volumes = range(0, 500).map(i => QuoteScale)

    expect(await getSupplyStats(fairpool)).to.deep.equal(zeroSupplyStats)
    const multiBuys = await mapAsync(volumes, volume => buy(fairpool, bob, volume))
    const afterMultiBuys = await getSupplyStats(fairpool)
    await selloff(fairpool, bob)

    expect(await getSupplyStats(fairpool)).to.deep.equal(zeroSupplyStats)
    const singleBuy = await buy(fairpool, bob, sumBNs(volumes))
    const afterSingleBuy = await getSupplyStats(fairpool)
    await selloff(fairpool, bob)

    // expect(afterSingleBuy).to.deep.equal(afterMultiBuys)
    const diff = subSupplyStats(afterSingleBuy, afterMultiBuys)
    // console.log('diff', diff)
    const maxDiff = { baseSupply: BaseScale.div(1000000), quoteSupply: bn(0) }
    expect(diff.baseSupply).to.be.greaterThanOrEqual(0)
    expect(diff.quoteSupply).to.be.greaterThanOrEqual(0)
    expect(diff.baseSupply).to.be.lessThanOrEqual(maxDiff.baseSupply)
    expect(diff.quoteSupply).to.be.lessThanOrEqual(maxDiff.quoteSupply)

    // // first transaction should be reverted
    // await expect(buy(fairpool, bob, quoteDeltaMinProposed.div(2))).to.be.revertedWithCustomError(fairpool, 'BaseDeltaMustBeGreaterThanZero')
    // // console.log('balance 1', await fairpool.balanceOf(bob.address))
    // // second transaction should be accepted
    // await buy(fairpool, bob, quoteDeltaMinProposed)
    // // console.log('balance 2', await fairpool.balanceOf(bob.address))
    // await buy(fairpool, bob, QuoteScale.mul(10))
    // // third transaction should be reverted because the totalSupply() has increased, so quoteDeltaProposedMin is not enough anymore
    // await expect(buy(fairpool, bob, quoteDeltaMinProposed)).to.be.revertedWithCustomError(fairpool, 'BaseDeltaMustBeGreaterThanZero')
  })

  fest('last seller does not have an advantage without taxes', async () => {
    await unsetTaxes()
    const volumes = range(0, 500).map(i => QuoteScale)
    const samQuoteBalanceBefore = await sam.getBalance()
    await buy(fairpool, sam, QuoteScale)
    await mapAsync(volumes, volume => buy(fairpool, bob, volume))
    await selloff(fairpool, bob)
    await selloff(fairpool, sam)
    const samQuoteBalanceAfter = await sam.getBalance()
    const profit = samQuoteBalanceAfter.sub(samQuoteBalanceBefore)
    // console.log('profit', renderETH(profit))
    expect(profit).to.be.lessThan(0)
  })

  // Can't move further with this test: BigNumber requires the pow() argument to be an integer
  // fest('quoteBuffer is calculated correctly', async () => {
  //   /**
  //    * // quoteBuffer is the area under the chart
  //    * price = slope * baseBuffer ^ (1 / weight - 1)
  //    * quoteBuffer = slope * baseBuffer ^ (1 / weight) / (1 / weight)
  //    * quoteBuffer = slope * weight * baseBuffer ^ (1 / weight)
  //    */
  //   const baseBuffer = await fairpool.baseBuffer()
  //   console.log('slope', slope)
  //   console.log('weight', weight)
  //   const slopeD = toFrontendQuoteScale(slope)
  //   const weightD = toFrontendWeightScale(weight)
  //   const baseBufferD = toFrontendBaseScale(baseBuffer)
  //   console.log('weightD', weightD.toString())
  //   console.log('slopeD', slopeD.toString())
  //   console.log('baseBufferD', baseBufferD.toString())
  //   const quoteBufferExpectedD = slopeD.multipliedBy(weightD).multipliedBy(baseBufferD.pow(num(1).div(weightD)))
  //   const quoteBufferActual = await fairpool.quoteBuffer()
  //   const quoteBufferActualD = toFrontendQuoteScale(quoteBufferActual)
  //   console.log('quoteBufferExpectedD', quoteBufferExpectedD)
  //   console.log('quoteBufferActualD', quoteBufferActualD)
  //   expect(quoteBufferExpectedD).to.equal(quoteBufferActualD)
  // })

  fest('setOperator', async () => {
    // before setOperator(bob.address)
    await expect(fairpoolAsBob.setOperator(bob.address)).to.be.revertedWithCustomError(fairpool, 'OnlyOperator')
    await fairpoolAsOperator.setOperator(bob.address)
    const operator1 = await fairpool.operator()
    expect(operator1).to.equal(bob.address)
    // after setOperator(bob.address)
    await expect(fairpoolAsOperator.setOperator(owner.address)).to.be.revertedWithCustomError(fairpool, 'OnlyOperator')
    await fairpoolAsBob.setOperator(operator.address)
    const operator2 = await fairpool.operator()
    expect(operator2).to.equal(operator.address)
  })

  fest('setRoyalties', async () => {
    await expectParameter(fairpool, owner, bob, 'royalties', 'setRoyalties', bn(1), 'Ownable: caller is not the owner', false)
  })

  fest('setEarnings', async () => {
    await expectParameter(fairpool, owner, bob, 'earnings', 'setEarnings', bn(1), 'Ownable: caller is not the owner', false)
  })

  fest('setFees', async () => {
    await expectParameter(fairpool, operator, bob, 'fees', 'setFees', bn(1), 'OnlyOperator', true)
  })

  /**
   * As baseSupply goes to Infinity, priceDelta goes to 0 (this is correct, since each `value` increment advances the price less and less)
   */
  fest('Price table', async () => {
    const count = 20
    const value = bn(10).pow(QuoteDecimals.sub(2))
    const signer = bob
    const transactions = await repeatAsync(count, () => buy(fairpool, signer, value))
    const events = await fairpool.queryFilter({ topics: [TradeEventTopic] })
    expect(events.length).to.equal(count)
    const network = await fairpool.provider.getNetwork()
    const trades = events.map(fromRawEvent(network.chainId)(parseTradeEvent))
    const pairs = toPrevNextMaybePairs(trades)
    const stringifier = getCsvStringifier({ header: true, columns: tradeEventPairCsvColumns }, fromTradeEventPairToCsv, pairs)
    // const out = process.stderr
    // debug(filename)
    if (isEnabledLog) {
      const filename = process.env.FILENAME
      const out = filename ? createWriteStream(filename) : process.stderr
      console.error(`'Writing to ${filename ?? 'stderr'}'`)
      await pipeline(stringifier, out)
    }
  })

  // fest('must get the gas per holder', async () => {
  //   const maxHoldersCount1 = 50
  //   const maxHoldersCount2 = 125
  //   const gasUsed1 = await getBigSellGasUsed(maxHoldersCount1)
  //   const gasUsed2 = await getBigSellGasUsed(maxHoldersCount2)
  //   const gasPerHolder = (gasUsed2.sub(gasUsed1)).div(maxHoldersCount2 - maxHoldersCount1)
  //   console.log('Gas per holder', gasPerHolder.toString())
  // })

  fest('must allow to recover tokens sent by mistake', async () => {
    const amount = 100
    const tokenId = 0

    const genericERC20Factory = await ethers.getContractFactory('GenericToken')
    const genericERC20 = (await genericERC20Factory.connect(sam).deploy('Test', 'TEST', [sam.address], [amount]))
    expect(await genericERC20.balanceOf(sam.address)).to.be.equal(amount)
    await genericERC20.transfer(fairpool.address, amount)
    expect(await genericERC20.balanceOf(fairpool.address)).to.be.equal(amount)
    await expect(fairpool.connect(owner).recoverERC20(genericERC20.address, amount)).to.be.revertedWithCustomError(fairpool, 'OnlyOperator')
    await fairpool.connect(operator).recoverERC20(genericERC20.address, amount)
    expect(await genericERC20.balanceOf(operator.address)).to.be.equal(amount)

    const genericERC721Factory = await ethers.getContractFactory('GenericERC721A')
    const genericERC721 = (await genericERC721Factory.connect(sam).deploy('Test', 'TEST', [sam.address], [amount]))
    expect(await genericERC721.ownerOf(tokenId)).to.be.equal(sam.address)
    await genericERC721.transferFrom(sam.address, fairpool.address, tokenId)
    expect(await genericERC721.ownerOf(tokenId)).to.be.equal(fairpool.address)
    await expect(fairpool.connect(owner).recoverERC721(genericERC721.address, tokenId)).to.be.revertedWithCustomError(fairpool, 'OnlyOperator')
    await fairpool.connect(operator).recoverERC721(genericERC721.address, tokenId)
    expect(await genericERC721.ownerOf(tokenId)).to.be.equal(operator.address)
  })

  fest('must disallow sending the tokens to the contract itself', async () => {
    await buy(fairpool, bob, QuoteScale)
    const balance = await fairpool.balanceOf(bob.address)
    await expect(fairpool.connect(bob).transfer(fairpool.address, balance)).to.be.revertedWithCustomError(fairpool, 'ToAddressMustBeNotEqualToThisContractAddress')
    await fairpool.connect(bob).transfer(sam.address, balance) // transfer to another address should be ok
  })

})

async function getProfit(slope: BN, weight: BN, owner: SignerWithAddress, bob: SignerWithAddress, sam: SignerWithAddress, bobAmount: AmountBN, samAmount: AmountBN) {
  const royalties = getSharePercent(30)
  const earnings = getSharePercent(20)
  const fairpoolFactory = await ethers.getContractFactory('FairpoolOwnerOperator')
  const fairpoolAsOwner = (await fairpoolFactory.connect(owner).deploy(
    'Abraham Lincoln Token',
    'ABRA',
    slope,
    weight,
    royalties,
    earnings,
    [],
    []
  )) as unknown as Fairpool
  const fairpool = fairpoolAsOwner.connect($zero)
  const quoteBalanceBefore = await bob.getBalance()
  await buy(fairpool, bob, bobAmount)
  await buy(fairpool, sam, samAmount)
  await selloff(fairpool, bob)
  const quoteBalanceAfter = await bob.getBalance()
  return quoteBalanceAfter.sub(quoteBalanceBefore)
}
