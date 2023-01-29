import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { toFrontendAmountBND } from '../../libs/utils/bignumber.convert'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
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
import { ensureQuoteDeltaMin, getSharePercent, getWeightPercent, quoteDeltaMinStatic } from '../support/Fairpool.helpers'
import { cleanEchidnaLogString, filterEchidnaLogString } from '../../utils-local/cleanEchidnaLogString'
import { parseTradeEvent, TradeEvent, TradeEventTopic } from '../../libs/fairpool/models/TradeEvent'
import { fromRawEvent } from '../../utils-local/fromRawEvent'
import { createWriteStream } from 'fs'
import { withCleanEthersError } from '../../utils-local/ethers/withCleanEthersError'
import { BaseDecimals, BaseScale, QuoteDecimals, QuoteScale } from '../../libs/fairpool/constants.all'
import { sumFees } from '../../utils-local/ethers/sumFees'
import { getContractBalance } from '../../utils-local/ethers/getContractBalance'
import { zero } from '../../libs/bn/constants'

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
  let dividends: BigNumber
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
    slope = bn(5)
    weight = getWeightPercent(33)
    royalties = getSharePercent(30)
    dividends = getSharePercent(20)
    fairpoolAsOwner = (await fairpoolFactory.connect(owner).deploy(
      'Abraham Lincoln Token',
      'ABRA',
      slope,
      weight,
      royalties,
      dividends,
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
    await fairpoolAsOwner.setDividends(0)
    await fairpoolAsOperator.setFees(0)
  }

  /**
   * @see getQuoteDeltaMinTask
   */

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
        // setFees(5) Time delay: 467824 seconds Block delay: 7658
        // setOperator(0x486981aa55a7602540540f0e02a4137d5b953444) Time delay: 128848 seconds Block delay: 11026
        // buy(29,559809169921) Value: 0x3a38d9132ca4be2bb Time delay: 88533 seconds Block delay: 4896
        // sell(596,760,115792089237316195423570985008687907853098509048339394248628124861006319694184) Time delay: 83958 seconds Block delay: 11483
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
    await expect(buy(fairpool, bob, quoteDeltaMinProposed)).to.eventually.be.ok
    // console.log('balance 2', await fairpool.balanceOf(bob.address))
    await buy(fairpool, bob, QuoteScale.mul(100))
    // third transaction should be accepted also, even though the totalSupply() has increased
    await expect(buy(fairpool, bob, quoteDeltaMinProposed)).to.eventually.be.ok
  })

  /**
   * NOTE: The user receives higher baseSupply from a single big buy tx than from multiple small buy txes (even if he spends the same quoteSupply)
   * Most likely it's caused by rounding in the power() function
   */
  fest('buys must be almost additive', async () => {
    await unsetTaxes()
    const volumes = range(0, 500).map(i => QuoteScale)

    expect(getSupplyStats(fairpool)).to.eventually.deep.equal(zeroSupplyStats)
    const multiBuys = await mapAsync(volumes, volume => buy(fairpool, bob, volume))
    const afterMultiBuys = await getSupplyStats(fairpool)
    await selloff(fairpool, bob)

    expect(getSupplyStats(fairpool)).to.eventually.deep.equal(zeroSupplyStats)
    const singleBuy = await buy(fairpool, bob, sumBNs(volumes))
    const afterSingleBuy = await getSupplyStats(fairpool)
    await selloff(fairpool, bob)

    // expect(afterSingleBuy).to.deep.equal(afterMultiBuys)
    const diff = subSupplyStats(afterSingleBuy, afterMultiBuys)
    const maxDiff = { baseSupply: BaseScale.div(1000000), quoteSupply: bn(0) }
    expect(diff.baseSupply).to.be.lessThanOrEqual(maxDiff.baseSupply)
    expect(diff.quoteSupply).to.be.lessThanOrEqual(maxDiff.quoteSupply)

    // // first transaction should be reverted
    // await expect(buy(fairpool, bob, quoteDeltaMinProposed.div(2))).to.be.revertedWithCustomError(fairpool, 'BaseDeltaMustBeGreaterThanZero')
    // // console.log('balance 1', await fairpool.balanceOf(bob.address))
    // // second transaction should be accepted
    // await expect(buy(fairpool, bob, quoteDeltaMinProposed)).to.eventually.be.ok
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

  fest('setDividends', async () => {
    await expectParameter(fairpool, owner, bob, 'dividends', 'setDividends', bn(1), 'Ownable: caller is not the owner', false)
  })

  fest('setFees', async () => {
    await expectParameter(fairpool, operator, bob, 'fees', 'setFees', bn(1), 'OnlyOperator', true)
  })

  fest('Price table', async () => {
    const count = 20
    const value = bn(10).pow(QuoteDecimals.sub(2))
    const signer = bob
    const transactions = await repeatAsync(count, () => buy(fairpool, signer, value))
    const events = await fairpool.queryFilter({ topics: [TradeEventTopic] })
    expect(events.length).to.equal(count)
    const network = await fairpool.provider.getNetwork()
    const trades = events.map(fromRawEvent(network.chainId)(parseTradeEvent))
    const fromTradeEventToCsv = (trade: TradeEvent) => {
      const { sender, isBuy, baseDelta, quoteDelta, quoteReceived } = trade
      const price = quoteDelta.div(baseDelta)
      const baseDeltaDisplayed = toFrontendAmountBND(BaseDecimals)(baseDelta)
      const quoteDeltaDisplayed = toFrontendAmountBND(QuoteDecimals)(quoteDelta)
      const quoteReceivedDisplayed = toFrontendAmountBND(QuoteDecimals)(quoteReceived)
      const priceDisplayed = quoteDeltaDisplayed.div(baseDeltaDisplayed)
      return [
        sender,
        isBuy,
        baseDelta,
        quoteDelta,
        price,
        baseDeltaDisplayed,
        quoteDeltaDisplayed,
        quoteReceivedDisplayed,
        priceDisplayed,
      ].map(v => v.toString())
    }
    const columns = [
      'sender',
      'isBuy',
      'baseDelta',
      'quoteDelta',
      'price',
      'baseDeltaDisplayed',
      'quoteDeltaDisplayed',
      'quoteReceivedDisplayed',
      'priceDisplayed',
    ]
    const stringifier = getCsvStringifier({ header: true, columns }, fromTradeEventToCsv, trades)
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

})
