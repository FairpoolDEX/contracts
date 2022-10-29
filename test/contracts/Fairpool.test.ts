import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { Fairpool } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { $zero } from '../../data/allAddresses'
import { BigNumber } from 'ethers'
import { fest } from '../../util-local/mocha'
import { mainnet } from '../../data/allNetworks'
import { bn } from '../../libs/bn/util'
import { MaxUint256, scale } from '../support/all.helpers'
import { getScaledPercent } from '../../models/Share'
import { parMap } from '../../util/promise'
import { range } from 'lodash'
import { assumeIntegerEnvVar } from '../../util/env'
import { expect } from '../../util-local/expect'

describe('Fairpool', async function () {
  let signers: SignerWithAddress[]
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let ben: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let sally: SignerWithAddress
  let ted: SignerWithAddress
  let tara: SignerWithAddress

  let fairpool: Fairpool
  let fairpoolAsOwner: Fairpool
  let fairpoolAsSam: Fairpool
  let fairpoolAsBob: Fairpool
  let fairpoolAsSally: Fairpool

  let now: Date

  let snapshot: unknown

  // let bid: number
  // let jump: number
  // let denominator: number

  const debug = $debug(this.title)

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
    signers = [owner, stranger, ben, bob, sam, ted, sally, tara] = await ethers.getSigners()

    const fairpoolFactory = await ethers.getContractFactory('Fairpool')
    fairpoolAsOwner = (await fairpoolFactory.connect(owner).deploy(
      'Abraham Lincoln Token',
      'ABRA',
      scale.mul(bn(2)),
      getScaledPercent(30),
      [ben.address, bob.address],
      [getScaledPercent(12), getScaledPercent(7)]
    )) as unknown as Fairpool
    fairpool = fairpoolAsOwner.connect($zero)
    fairpoolAsBob = fairpoolAsOwner.connect(bob)
    fairpoolAsSam = fairpoolAsOwner.connect(sam)
    fairpoolAsSally = fairpoolAsOwner.connect(sally)

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

  const getGasUsedForManyHolders = async (maxHoldersCount: number) => {
    snapshot = await getSnapshot()
    const balanceQuoteTotal = await owner.getBalance()
    const buyTx = await fairpoolAsOwner.buy(0, MaxUint256, { value: bn(1000).mul(scale) })
    const balanceBaseBeforeTransfers = await fairpoolAsOwner.balanceOf(owner.address)
    const totalSupply = await fairpoolAsOwner.totalSupply()
    const sendTxes = await parMap(range(0, maxHoldersCount), async i => {
      const wallet = ethers.Wallet.createRandom()
      // preload the address with ETH to reduce the gas cost of send() in distribute()
      // await owner.sendTransaction({
      //   to: wallet.address,
      //   value: 1,
      // })
      return fairpoolAsOwner.transfer(wallet.address, bn(1000))
    })
    const balanceBaseAfterTransfers = await fairpoolAsOwner.balanceOf(owner.address)
    const sellTx = await fairpoolAsOwner.sell(balanceBaseAfterTransfers, 0, MaxUint256)
    const sellTxReceipt = await sellTx.wait(1)
    // console.log('sellTxReceipt', sellTxReceipt.gasUsed.toString())
    await revertToSnapshot([snapshot])
    return sellTxReceipt.gasUsed
  }

  fest('must keep the sell() transaction under block gas limit', async () => {
    const { blockGasLimit } = mainnet
    const maxHoldersCount = assumeIntegerEnvVar('MAX_HOLDER_COUNT', 500)
    const gasUsed = await getGasUsedForManyHolders(maxHoldersCount)
    expect(gasUsed).to.be.lte(blockGasLimit / 10)
  })

  // fest('must get the gas per holder', async () => {
  //   const maxHoldersCount1 = 50
  //   const maxHoldersCount2 = 125
  //   const gasUsed1 = await getBigSellGasUsed(maxHoldersCount1)
  //   const gasUsed2 = await getBigSellGasUsed(maxHoldersCount2)
  //   const gasPerHolder = (gasUsed2.sub(gasUsed1)).div(maxHoldersCount2 - maxHoldersCount1)
  //   console.log('Gas per holder', gasPerHolder.toString())
  // })

  // fest('must increase the price after buy', async () => {
  //   const amount = bn(10)
  //   const result = await fairpoolAsBob.buy(amount)
  //   const bidAfterExpected = bid.mul((1 + jump).pow(amount))
  //   // jumpUI = 1
  //   // bid = 10
  //   // amount = 5
  //   // bidAfterExpected = 10 * (1 + 0.01) ^ 5
  //   // bidAfterExpected = (bid * scale) * (1 * scale / scale + jump * scale / scale) ^ (amount * scale / scale)
  //   // amount should not be scaled, jump should not be scaled
  //   // actualJump = 0.01 * 1e18 = 1e16
  //   // actualBid = 10 * 1e18 = 10e18
  //   // actualAmount = 5 * 1e18 = 5e18
  //   // actualBidAfterExpected = actualBid *
  //   const bidAfterActual = await fairpoolAsBob.bid()
  //   expect(bidAfter).to.be.gt(bid)
  // })

  // fest('must calculate bid correctly', async () => {
  //   const decimals = 18
  //   const scale = toBackendAmountBN(1, decimals)
  //   const currentN = 10
  //   const currentBS = toBackendAmountBN(currentN, decimals)
  //   const totalN = 5 // how much the user spends
  //   const totalBS = toBackendAmountBN(totalN, decimals)
  //   const speedN = 0.01
  //   const speedBS = toBackendAmountBN(speedN, decimals)
  //   const getAmountBSScaled = getAmountBS(scale)
  //   const newBidFP = getAmountN(currentN, totalN, speedN)
  //   const newBidBSExpected = toBackendAmountBN(newBidFP, decimals)
  //   const newBidBSActual = getAmountBSScaled(bidBS, totalBS, speedBS)
  //   const diffAbs = newBidBSExpected.sub(newBidBSActual).abs()
  //   expect(diffAbs).to.be.lte(bn(100))
  // })

})

const getAmountN = (baseAmount: number, quoteAmount: number, quoteDelta: number, speed: number) => {
  const quoteFinal = quoteAmount + quoteDelta
  const baseFinal = speed * Math.sqrt(quoteFinal)
  return baseFinal - baseAmount
}

// const getAmountBS = (scale: BigNumber) => (bid: BigNumber, total: BigNumber, jump: BigNumber) => {
//   return stub<BigNumber>()
// }

type GetAmountN<State> = (state: State, total: number) => [State, number]

const chain = <State, Inputs extends unknown[], Outputs extends unknown[]>(state: State, ...inputsArr: Inputs[]) => (func: (state: State, ...input: Inputs) => [State, ...Outputs]) => {
  return inputsArr.reduce((state, inputs) => {
    const [stateNew] = func(state, ...inputs)
    return stateNew
  }, state)
}

/**
 * Looks like bid & jump are functionally dependent
 */
const getAmountBS = (basePrice: BigNumber, total: BigNumber, jump: BigNumber) => {

}
