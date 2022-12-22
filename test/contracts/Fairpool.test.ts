import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { Fairpool, FairpoolTest } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { $zero } from '../../data/allAddresses'
import { BigNumber } from 'ethers'
import { fest } from '../../util-local/mocha'
import { mainnet } from '../../data/allNetworks'
import { bn } from '../../libs/bn/utils'
import { getQuoteAmountMin, getScaledPercent, scale } from '../support/Fairpool.helpers'
import { range } from 'lodash'
import { assumeIntegerEnvVar } from '../../util/env'
import { expect } from '../../util-local/expect'
import { mapAsync, sequentialMap } from 'libs/utils/promise'
import { MaxUint256 } from '../../libs/ethereum/constants'
import { identity } from 'remeda'
import { Address } from '../../models/Address'
import { parseAddress } from '../../libs/ethereum/models/Address'
import { ensure, ensureGet } from '../../libs/utils/ensure'
import { LogLevel } from '../../util-local/ethers'
import { CallOverrides } from '@ethersproject/contracts/src.ts/index'
import { hexZeroPad } from '@ethersproject/bytes'
import { todo } from '../../libs/utils/todo'

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

  let speed: BigNumber
  let royalties: BigNumber
  let dividends: BigNumber
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
    const buyTx = await fairpoolAsOwner.buy(0, MaxUint256, { value: bn(1000).mul(getQuoteAmountMin(speed, scale)) })
    const balanceBaseBeforeTransfers = await fairpoolAsOwner.balanceOf(owner.address)
    const balanceBaseMinForSell = scale.mul(2)
    const balanceBaseForTransfers = balanceBaseBeforeTransfers.sub(balanceBaseMinForSell)
    const transferAmount = balanceBaseForTransfers.div(maxHoldersCount)
    const sendTxes = await mapAsync(range(0, maxHoldersCount), async i => {
      const wallet = ethers.Wallet.createRandom()
      // preload the address with ETH to reduce the gas cost of send() in distribute()
      // await owner.sendTransaction({
      //   to: wallet.address,
      //   value: 1,
      // })
      return fairpoolAsOwner.transfer(wallet.address, transferAmount)
    })
    const sellTx = await fairpoolAsOwner.sell(balanceBaseMinForSell, 0, MaxUint256)
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

  fest('must replay Echidna transactions', async () => {
    ethers.utils.Logger.setLogLevel(LogLevel.ERROR) // suppress "Duplicate definition" warnings
    const fairpoolTestFactory = await ethers.getContractFactory('FairpoolTest')
    const fairpool = (await fairpoolTestFactory.connect(owner).deploy()) as unknown as FairpoolTest
    const callers = {
      '0x0000000000000000000000000000000000010000': ben,
      '0x0000000000000000000000000000000000020000': bob,
      '0x0000000000000000000000000000000000030000': owner,
    }
    // const transactionsRaw = ''
    const transactionsRaw = `
        transferOwnership(0x20000) from: 0x0000000000000000000000000000000000030000 Time delay: 48551 seconds Block delay: 26540
        setSpeed(15) from: 0x0000000000000000000000000000000000020000 Time delay: 29218 seconds Block delay: 60226
        buy(2,103895064935751566547449530349109067107879149236133541355761536741632193449489) from: 0x0000000000000000000000000000000000030000 Value: 0x1a8c0402d4562fd66 Time delay: 554469 seconds Block delay: 60039
        sell(4294967295,0,115792089237316195423570985008687907853269984665640564039457584007913129574401) from: 0x0000000000000000000000000000000000030000 Time delay: 338920 seconds Block delay: 53308
    `
    const transactions = transactionsRaw.split('\n').map(s => s.trim()).filter(identity).map(parseTransaction(callers))
    const results = await sequentialMap(transactions, async ({ caller, name, args, value, origin }) => {
      console.info('Executing', origin)
      const context = fairpool.connect(caller)
      const overrides: CallOverrides = { value }
      const argsWithOverrides = [...args, overrides]
      // hack to allow calling arbitrary functions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (context[name] as any).apply(context, argsWithOverrides)
    })
  })

  const getGasUsedForSeparateSellAndWithdraw = async () => {
    snapshot = await getSnapshot()
    const balanceQuoteTotal = await owner.getBalance()
    const buyTx = await fairpoolAsOwner.buy(0, MaxUint256, { value: bn(1000).mul(getQuoteAmountMin(speed, scale)) })
    const balance = await fairpoolAsOwner.balanceOf(owner.address)
    const sellTx = await fairpoolAsOwner.sell(balance, 0, MaxUint256)
    const sellTxReceipt = await sellTx.wait(1)
    const withdrawTx = await fairpoolAsOwner.withdraw()
    const withdrawTxReceipt = await withdrawTx.wait(1)
    await revertToSnapshot([snapshot])
    return sellTxReceipt.gasUsed.add(withdrawTxReceipt.gasUsed)
  }

  fest('get transaction costs', async () => {
    const separate = await getGasUsedForSeparateSellAndWithdraw()
    const combined = await getGasUsedForCombinedSellAndWithdraw()
    const diff = separate.sub(combined)
    console.info('stats', separate.toString(), combined.toString(), diff.toString())
  })

  const getGasUsedForCombinedSellAndWithdraw = async () => {
    snapshot = await getSnapshot()
    const balanceQuoteTotal = await owner.getBalance()
    const buyTx = await fairpoolAsOwner.buy(0, MaxUint256, { value: bn(1000).mul(getQuoteAmountMin(speed, scale)) })
    const balance = await fairpoolAsOwner.balanceOf(owner.address)
    const sellAndWithdrawTx = await fairpoolAsOwner.sellAndWithdraw(balance, 0, MaxUint256)
    const sellAndWithdrawTxReceipt = await sellAndWithdrawTx.wait(1)
    await revertToSnapshot([snapshot])
    return sellAndWithdrawTxReceipt.gasUsed
  }

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

type TransactionArg = BigNumber | Address

interface Transaction {
  origin: string
  caller: SignerWithAddress
  name: Parameters<FairpoolTest['interface']['getFunction']>[0]
  args: TransactionArg[]
  value: BigNumber
  timeDelay: BigNumber
  blockDelay: BigNumber
}

const parseTransaction = (callers: Record<Address, SignerWithAddress>) => (origin: string): Transaction => {
  const [callRaw] = origin.split(' ')
  // TODO: hardcode Transaction['name'] type
  const [_, name, argsRaw] = ensure(callRaw.match(/^(\w+)\(([^(]*)\)$/)) as [string, Transaction['name'], string]
  const from = ensure(parseLineComponent('from', parseAddress, origin))
  const value = parseLineComponent('Value', bn, origin) || bn(0)
  const timeDelay = parseLineComponent('Time delay', bn, origin) || bn(0)
  const blockDelay = parseLineComponent('Block delay', bn, origin) || bn(0)
  // assuming all args are numbers (better to use decode here)
  const argsSplit = argsRaw.split(',').filter(identity)
  const args: TransactionArg[] = argsSplit.map(bn)
  // begin hack
  if (name === 'transferOwnership') {
    args[0] = ensureGet(callers, parseAddress(hexZeroPad(argsSplit[0], 20))).address
  }
  // end hack
  const caller = ensureGet(callers, from)
  return { origin, caller, name, args, value, blockDelay, timeDelay }
}

const stringifyTransaction = (callers: Record<Address, SignerWithAddress>) => (transaction: Transaction) => {
  const { caller, name, args, blockDelay, timeDelay, value } = transaction
  const splinters = []
  splinters.push(`${name}(${args.map(stringifyArg).join(',')})`)
  splinters.push(`From: ${caller.address}`)
  // incomplete
  return todo()
}

const stringifyArg = (arg: TransactionArg): string => {
  if (arg instanceof BigNumber) return arg.toString()
  return arg
}

function parseLineComponent<T>(name: string, parser: (value: string) => T, line: string) {
  const matches = line.match(new RegExp(`${name}: ([^\\s]+)`))
  if (matches) {
    return parser(matches[1])
  }
}
