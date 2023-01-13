import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { toFrontendAmountBND } from '../../libs/utils/bignumber.convert'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { Fairpool } from '../../typechain-types'
import { $zero } from '../../data/allAddresses'
import { BigNumber } from 'ethers'
import { fest } from '../../util-local/mocha'
import { mainnet } from '../../libs/ethereum/data/allNetworks'
import { DefaultDecimals as baseDecimals, DefaultScale as baseScale } from '../../libs/fairpool/constants'
import { assumeIntegerEnvVar } from '../../util/env'
import { expect } from '../../util-local/expect'
import { parallelMap, sequentialMap } from 'libs/utils/promise'
import { identity, range } from 'remeda'
import { Address } from '../../models/Address'
import { getSignatures } from '../../util-local/getSignatures'
import { getGasUsedForManyHolders } from './Fairpool/getGasUsedForManyHolders'
import { deployFairpoolTest } from './Fairpool/deployFairpoolTest'
import { Rewrite } from '../../libs/utils/rewrite'
import { parseTransactionInfo } from '../../libs/echidna/parseTransactionInfo'
import { executeTransaction } from '../../libs/echidna/executeTransaction'
import { bn } from '../../libs/bn/utils'
import { DefaultDecimals as quoteDecimals, MaxUint256 } from '../../libs/ethereum/constants'
import { buy } from '../support/Fairpool.functions'
import { BuyEvent, BuyEventTopic } from '../../libs/fairpool/models/BuyEvent'
import { fromRawEventToBuyEvent } from '../../models/BuyEvent/fromRawEventToBuyEvent'
import { expectParameter } from './Fairpool/expectParameter'
import { getCsvStringifier } from '../../libs/utils/csv'
import { tmpdir } from 'os'
import { getDebug, isEnabledLog } from '../../libs/utils/debug'
import { pipeline } from '../../libs/utils/stream'
import { getScaledPercent } from '../support/Fairpool.helpers'

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

  let speed: BigNumber
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
    speed = getScaledPercent(200)
    royalties = getScaledPercent(30)
    dividends = getScaledPercent(20)
    fairpoolAsOwner = (await fairpoolFactory.connect(owner).deploy(
      'Abraham Lincoln Token',
      'ABRA',
      speed,
      royalties,
      dividends,
      [ben.address, bob.address],
      [getScaledPercent(12), getScaledPercent(88)]
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

  fest('must keep the sell() transaction under block gas limit', async () => {
    const { blockGasLimit } = mainnet
    const maxHoldersCount = assumeIntegerEnvVar('MAX_HOLDER_COUNT', 500)
    const gasUsed = await getGasUsedForManyHolders(fairpool, owner, maxHoldersCount)
    expect(gasUsed).to.be.lte(blockGasLimit / 10)
  })

  fest('must replay Echidna transactions', async () => {
    const echidnaLog = `
      setSpeed(266) from: 0x0000000000000000000000000000000000030000 Time delay: 124482 seconds Block delay: 15771
      transferShares(0x10000,16) from: 0x0000000000000000000000000000000000030000 Time delay: 18 seconds Block delay: 41552
      transferShares(0x30000,7) from: 0x0000000000000000000000000000000000010000 Time delay: 4121 seconds Block delay: 1001
      buy(65537,115792089237316195423570985008687907853269984665640564039457584007913129639808) from: 0x0000000000000000000000000000000000010000 Value: 0x322ec6b9a77f4a56 Time delay: 58862 seconds Block delay: 44445
      transferShares(0xc17c4dd16364f52552d996cfe73d259a0fc7ba8e,9) from: 0x0000000000000000000000000000000000010000 Time delay: 255 seconds Block delay: 28613
      test() from: 0x0000000000000000000000000000000000010000 Time delay: 382087 seconds Block delay: 7755
    `
    const echidnaLines = echidnaLog.split('\n').map(s => s.trim()).filter(identity)
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
    const hasAssertionFailed = !!results.find(({ logs }) => logs.find(l => l.name === 'AssertionFailed'))
    if (hasAssertionFailed) throw new Error('AssertionFailed')
  })

  fest('quoteDeltaProposedMin', async () => {
    const quoteDeltaProposedMin = speed.mul(baseScale)
    // first transaction should be reverted
    await expect(fairpoolAsBob.buy(0, MaxUint256, { value: quoteDeltaProposedMin.sub(1) })).to.be.revertedWithCustomError(fairpool, 'BaseDeltaMustBeGreaterThanZero')
    // second transaction should be accepted
    await expect(fairpoolAsBob.buy(0, MaxUint256, { value: quoteDeltaProposedMin })).to.eventually.be.ok
    // third transaction should be reverted because the totalSupply() has increased, so quoteDeltaProposedMin is not enough anymore
    await expect(fairpoolAsBob.buy(0, MaxUint256, { value: quoteDeltaProposedMin })).to.be.revertedWithCustomError(fairpool, 'BaseDeltaMustBeGreaterThanZero')
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
    const value = bn(10).pow(quoteDecimals.sub(2))
    const signer = bob
    const transactions = await parallelMap(range(0, count), async () => {
      return buy(fairpool, signer, value)
    })
    const events = await fairpool.queryFilter({ topics: [BuyEventTopic] })
    expect(events.length).to.equal(count)
    const buys = events.map(fromRawEventToBuyEvent)
    const fromBuyEventToCsv = (buy: BuyEvent) => {
      const { sender, baseDelta, quoteDelta } = buy
      const price = quoteDelta.div(baseDelta)
      const baseDeltaDisplayed = toFrontendAmountBND(baseDecimals)(baseDelta)
      const quoteDeltaDisplayed = toFrontendAmountBND(quoteDecimals)(quoteDelta)
      const priceDisplayed = quoteDeltaDisplayed.div(baseDeltaDisplayed)
      return [
        sender,
        baseDelta,
        quoteDelta,
        price,
        baseDeltaDisplayed,
        quoteDeltaDisplayed,
        priceDisplayed,
      ].map(v => v.toString())
    }
    const columns = [
      'sender',
      'baseDelta',
      'quoteDelta',
      'price',
      'baseDeltaDisplayed',
      'quoteDeltaDisplayed',
      'priceDisplayed',
    ]
    const stringifier = getCsvStringifier({ header: true, columns }, fromBuyEventToCsv, buys)
    const filename = `${tmpdir()}/buys.csv`
    // debug(filename)
    if (isEnabledLog) await pipeline(stringifier, process.stderr)
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
