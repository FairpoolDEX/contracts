import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { Fairpool, FairpoolTest } from '../../typechain-types'
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
import { identity, zip } from 'remeda'
import { Address } from '../../models/Address'
import { parseAddress } from '../../libs/ethereum/models/Address'
import { ensure, ensureFind } from '../../libs/utils/ensure'
import { LogLevel } from '../../util-local/ethers'
import { CallOverrides } from '@ethersproject/contracts/src.ts/index'
import { ContractTransaction } from '@ethersproject/contracts'
import { renderLogDescription } from '../../util-local/ethers/renderLogDescription'
import { show } from '../../libs/utils/debug'
import { FunctionCall, parseFunctionCall } from '../../util-local/parseFunctionCall'
import { getSignatures } from '../../util-local/getSignatures'
import { hexZeroPad } from 'ethers/lib/utils'

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
    const fairpoolTest = (await fairpoolTestFactory.connect(owner).deploy()) as unknown as FairpoolTest
    const rewrites: Rewrite<Address>[] = [
      { from: '0x0000000000000000000000000000000000030000', to: owner.address },
      { from: '0x0000000000000000000000000000000000020000', to: bob.address },
      { from: '0x0000000000000000000000000000000000010000', to: ben.address },
      { from: '0x00a329c0648769a73afac7f9381e08fb43dbea72', to: fairpoolTest.address },
    ]
    const signatures = getSignatures(fairpoolTest.interface.functions)
    const echidnaLog = `
      setSpeed(266) from: 0x0000000000000000000000000000000000030000 Time delay: 124482 seconds Block delay: 15771
      transferShares(0x10000,16) from: 0x0000000000000000000000000000000000030000 Time delay: 18 seconds Block delay: 41552
      transferShares(0x30000,7) from: 0x0000000000000000000000000000000000010000 Time delay: 4121 seconds Block delay: 1001
      buy(65537,115792089237316195423570985008687907853269984665640564039457584007913129639808) from: 0x0000000000000000000000000000000000010000 Value: 0x322ec6b9a77f4a56 Time delay: 58862 seconds Block delay: 44445
      transferShares(0xc17c4dd16364f52552d996cfe73d259a0fc7ba8e,9) from: 0x0000000000000000000000000000000000010000 Time delay: 255 seconds Block delay: 28613
      test() from: 0x0000000000000000000000000000000000010000 Time delay: 382087 seconds Block delay: 7755
    `
    const echidnaLines = echidnaLog.split('\n').map(s => s.trim()).filter(identity)
    const infos = echidnaLines.map(parseTransactionInfo(signatures, rewrites))
    const results = await sequentialMap(infos, async (info) => {
      const { caller, name, args, value, origin } = info
      show('\n' + stringifyTransaction(info))
      const signer = ensureFind(signers, s => s.address === caller)
      const context = fairpoolTest.connect(signer)
      const overrides: CallOverrides = { value }
      const argsWithOverrides = [...args, overrides]
      // hack to allow calling arbitrary functions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction = await (context[name] as any).apply(context, argsWithOverrides) as ContractTransaction
      const receipt = await transaction.wait(1) // TODO: the block number will be incremented, so "Block delay" will not work as intended. However, we want to preserve the order of console.log's, so we want to wait here
      const logs = receipt.logs.map(l => fairpoolTest.interface.parseLog(l))
      show(logs.map(renderLogDescription))
      return { info, transaction, receipt, logs }
    })
    const hasAssertionFailed = !!results.find(({ logs }) => logs.find(l => l.name === 'AssertionFailed'))
    if (hasAssertionFailed) throw new Error('AssertionFailed')
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

  // fest('get transaction costs', async () => {
  //   const separate = await getGasUsedForSeparateSellAndWithdraw()
  //   const combined = await getGasUsedForCombinedSellAndWithdraw()
  //   const diff = separate.sub(combined)
  //   show('stats', separate.toString(), combined.toString(), diff.toString())
  // })

  // const getGasUsedForCombinedSellAndWithdraw = async () => {
  //   snapshot = await getSnapshot()
  //   const balanceQuoteTotal = await owner.getBalance()
  //   const buyTx = await fairpoolAsOwner.buy(0, MaxUint256, { value: bn(1000).mul(getQuoteAmountMin(speed, scale)) })
  //   const balance = await fairpoolAsOwner.balanceOf(owner.address)
  //   const sellAndWithdrawTx = await fairpoolAsOwner.sellAndWithdraw(balance, 0, MaxUint256)
  //   const sellAndWithdrawTxReceipt = await sellAndWithdrawTx.wait(1)
  //   await revertToSnapshot([snapshot])
  //   return sellAndWithdrawTxReceipt.gasUsed
  // }

  // fest('must get the gas per holder', async () => {
  //   const maxHoldersCount1 = 50
  //   const maxHoldersCount2 = 125
  //   const gasUsed1 = await getBigSellGasUsed(maxHoldersCount1)
  //   const gasUsed2 = await getBigSellGasUsed(maxHoldersCount2)
  //   const gasPerHolder = (gasUsed2.sub(gasUsed1)).div(maxHoldersCount2 - maxHoldersCount1)
  //   console.log('Gas per holder', gasPerHolder.toString())
  // })

})

type TransactionInfoArg = BigNumber | Address

interface TransactionInfo {
  origin: string
  caller: Address
  name: Parameters<FairpoolTest['interface']['getFunction']>[0]
  args: TransactionInfoArg[]
  value: BigNumber
  timeDelay: BigNumber
  blockDelay: BigNumber
}

const parseTransactionInfo = (signatures: FunctionCall[], rewrites: Rewrite<Address>[]) => (origin: string): TransactionInfo => {
  const [callRaw] = origin.split(' ')
  const call = parseFunctionCall(callRaw)
  const name = call.name as TransactionInfo['name']
  const signature = ensureFind(signatures, s => s.name === name)
  const from = parseLineComponent('from', parseAddress, origin)
  const value = parseLineComponent('Value', bn, origin) || bn(0)
  const timeDelay = parseLineComponent('Time delay', bn, origin) || bn(0)
  const blockDelay = parseLineComponent('Block delay', bn, origin) || bn(0)
  const args = parseTransactionInfoArgs(signature.args, rewrites)(call.args)
  const caller = (from ? ensureFind(rewrites, c => c.from === from) : rewrites[0]).to
  return { origin, caller, name, args, value, blockDelay, timeDelay }
}

const parseTransactionInfoArgs = (types: string[], rewrites: Rewrite<Address>[]) => (args: string[]) => {
  ensure(types.length === args.length)
  let from: Address
  let rewrite: Rewrite<Address> | undefined
  return zip(args, types).map(([arg, type]) => {
    switch (true) {
      case type.startsWith('int'):
      case type.startsWith('uint'):
        return bn(arg)
      case type === 'string':
        return arg
      case type === 'address':
        from = parseAddress(hexZeroPad(arg, 20))
        rewrite = rewrites.find(r => r.from === from)
        return rewrite ? rewrite.to : from
      default:
        throw new Error(`Unknown type "${type}" for arg "${arg}"`)
    }
  })
}

const stringifyTransaction = (transaction: TransactionInfo) => {
  const { caller, name, args, blockDelay, timeDelay, value } = transaction
  const splinters = []
  splinters.push(`${name}(${args.map(stringifyArg).join(',')})`)
  splinters.push(`From: ${caller}`)
  splinters.push(`Value: ${value.toString()}`)
  splinters.push(`Time delay: ${timeDelay.toString()}`)
  splinters.push(`Block delay: ${blockDelay.toString()}`)
  return splinters.join(' ')
}

interface Rewrite<T> {
  from: T
  to: T
}

// const toAddressRewrites = (callers: Caller[]): Rewrite<Address>[] => callers.map(c => ({ from: c.address, to: c.signer.address }))

const stringifyArg = (arg: TransactionInfoArg): string => {
  if (arg instanceof BigNumber) return arg.toString()
  return arg
}

function parseLineComponent<T>(name: string, parser: (value: string) => T, line: string) {
  const matches = line.match(new RegExp(`${name}: ([^\\s]+)`))
  if (matches) {
    return parser(matches[1])
  }
}
