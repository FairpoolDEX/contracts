import { expect } from '../../util-local/expect'
import { flatten } from 'lodash'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expectSignerBalances, getLatestBlockTimestamp, getSnapshot, revertToSnapshot, setNextBlockTimestamp } from '../support/test.helpers'
import { BaseToken, MCP, QuoteToken } from '../../typechain-types'
import { dateToTimestampSeconds } from 'hardhat/internal/util/date'
import { beforeEach } from 'mocha'
import { TokenModel } from '../support/fast-check/models/TokenModel'
import { Address } from '../../models/Address'
import { $zero } from '../../data/allAddresses'
import { hours } from '../../util-local/time'
import { fest } from '../../util-local/mocha'

describe('Market Crash Protection', async () => {
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let mark: SignerWithAddress // MCP contract owner
  let bob: SignerWithAddress // buyer
  let sam: SignerWithAddress // seller
  let bella: SignerWithAddress // buyer
  let sally: SignerWithAddress // seller

  let base: BaseToken
  let baseAsOwner: BaseToken
  let baseAsStranger: BaseToken
  let baseAsBob: BaseToken
  let baseAsSam: BaseToken

  let quote: BaseToken
  let quoteAsOwner: QuoteToken
  let quoteAsStranger: QuoteToken
  let quoteAsBob: QuoteToken
  let quoteAsSam: QuoteToken

  let mcp: MCP
  let mcpAsMark: MCP
  let mcpAsSam: MCP
  let mcpAsBob: MCP

  let baseTokenModel: TokenModel
  let quoteTokenModel: TokenModel

  let now: Date

  const feeDivisorMin = 100
  const cancellationTimeout = 6 * hours / 1000
  const totalBaseAmount = 1000000000000000
  const totalQuoteAmount = 1000000000000
  const initialBaseAmount = 1000000000000
  const initialQuoteAmount = 30000000000

  const getFee = (amount: number) => Math.trunc(amount / feeDivisorMin * 40)

  let snapshot: unknown

  // let WETH = { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }
  // let USDT = { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" }
  // let SHLD = { address: "0xd49efa7bc0d339d74f487959c573d518ba3f8437" }

  let baseAddress: Address
  let quoteAddress: Address
  let sellerAddress: Address
  let guaranteedAmount: number
  let guaranteedPrice: number
  let expirationDate: number
  let premium: number
  let fee: number
  let coverage: number
  let protectionIndex: number

  before(async () => {
    const signers = [owner, stranger, mark, bob, sam, bella, sally] = await ethers.getSigners()
    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => initialBaseAmount)
    const quoteRecipients = signers.map((s) => s.address)
    const quoteAmounts = signers.map(() => initialQuoteAmount)

    const baseTokenFactory = await ethers.getContractFactory('BaseToken')
    baseAsOwner = (await upgrades.deployProxy(baseTokenFactory, [totalBaseAmount, baseRecipients, baseAmounts])) as unknown as BaseToken
    await baseAsOwner.deployed()
    base = baseAsOwner.connect($zero)
    baseAsStranger = baseAsOwner.connect(stranger)
    baseAsBob = baseAsOwner.connect(bob)
    baseAsSam = baseAsOwner.connect(sam)

    const quoteTokenFactory = await ethers.getContractFactory('QuoteToken')
    quoteAsOwner = (await upgrades.deployProxy(quoteTokenFactory, [totalQuoteAmount, quoteRecipients, quoteAmounts])) as unknown as QuoteToken
    await quoteAsOwner.deployed()
    quote = quoteAsOwner.connect($zero)
    quoteAsStranger = quoteAsOwner.connect(stranger)
    quoteAsBob = quoteAsOwner.connect(bob)
    quoteAsSam = quoteAsOwner.connect(sam)

    const mcpFactory = await ethers.getContractFactory('MCP')
    mcpAsMark = (await mcpFactory.connect(mark).deploy(feeDivisorMin)) as unknown as MCP
    mcp = mcpAsMark.connect($zero)
    mcpAsBob = mcpAsMark.connect(bob)
    mcpAsSam = mcpAsMark.connect(sam)

    const approvals = flatten([bob, sam, bella, sally].map((signer) => [
      baseAsOwner.connect(signer).approve(mcpAsMark.address, initialBaseAmount),
      quoteAsOwner.connect(signer).approve(mcpAsMark.address, initialQuoteAmount),
    ]))
    await Promise.all(approvals)

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)

    baseAddress = base.address
    quoteAddress = quote.address
    sellerAddress = sam.address
    guaranteedAmount = 100000
    guaranteedPrice = 5000
    expirationDate = dateToTimestampSeconds(now) + 100
    premium = 5000
    fee = getFee(premium)
    coverage = guaranteedAmount * guaranteedPrice
    protectionIndex = 0
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  for (const payInBase of [true, false]) {
    const suffix = payInBase ? '(pay in base)' : '(pay in quote)'

    describe(`buy ${suffix}`, async () => {
      fest(`must allow to buy ${suffix}`, async () => {
        await mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, fee, payInBase)
        await expectSignerBalances([
          [bob, base, initialBaseAmount - (payInBase ? premium + fee : 0)],
          [bob, quote, initialQuoteAmount - (!payInBase ? premium + fee : 0)],
          [sam, base, initialBaseAmount],
          [sam, quote, initialQuoteAmount],
          [mark, base, initialBaseAmount],
          [mark, quote, initialQuoteAmount],
        ])
      })

      fest(`must not allow to buy if expiration date is less than block timestamp ${suffix}`, async () => {
        await expect(mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, dateToTimestampSeconds(now) - 1, premium, fee, payInBase)).to.be.revertedWith('MCP: BEXP')
      })

      fest(`must not allow to buy if buyer doesn't have enough balance ${suffix}`, async () => {
        const premiumNext = premium + (payInBase ? initialBaseAmount : initialQuoteAmount)
        const feeNext = getFee(premiumNext)
        await expect(mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premiumNext, feeNext, payInBase)).to.be.revertedWith('transfer amount exceeds balance')
      })

      fest(`must not allow to buy if buyer sets a zero premium ${suffix}`, async () => {
        await expect(mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, 0, fee, payInBase)).to.be.revertedWith('MCP: BPGD')
      })

      fest(`must not allow to buy if buyer sets a fee that is less than premium / feeDivisorMin ${suffix}`, async () => {
        await expect(mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, 0, payInBase)).to.be.revertedWith('MCP: BFSM')
      })
    })

    describe(`sell ${suffix}`, async () => {
      beforeEach(async () => {
        await mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, fee, payInBase)
      })

      fest(`must allow to sell ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await expectSignerBalances([
          [bob, base, initialBaseAmount - (payInBase ? premium + fee : 0)],
          [bob, quote, initialQuoteAmount - (!payInBase ? premium + fee : 0)],
          [sam, base, initialBaseAmount + (payInBase ? premium : 0)],
          [sam, quote, initialQuoteAmount + (!payInBase ? premium : 0) - coverage],
          [mark, base, initialBaseAmount + (payInBase ? fee : 0)],
          [mark, quote, initialQuoteAmount + (!payInBase ? fee : 0)],
        ])
      })

      fest(`must not allow to sell if seller doesn't have enough balance ${suffix}`, async () => {
        await quoteAsSam.transfer(mark.address, await quoteAsSam.balanceOf(sam.address))
        await expect(mcpAsSam.sell(protectionIndex)).to.be.revertedWith('transfer amount exceeds balance')
      })

      fest(`must not allow to sell if seller address is different from specified address ${suffix}`, async () => {
        await expect(mcpAsMark.sell(protectionIndex)).to.be.revertedWith('MCP: SPSS')
      })

      fest(`must not allow to sell if protection has expired ${suffix}`, async () => {
        await setNextBlockTimestamp(expirationDate + 1)
        await expect(mcpAsSam.sell(protectionIndex)).to.be.revertedWith('MCP: SPET')
      })

      fest(`must not allow to sell if protection does not exist ${suffix}`, async () => {
        await expect(mcpAsSam.sell(protectionIndex + 1)).to.be.revertedWith('revert')
      })

      fest(`must not allow to sell if protection is cancelled ${suffix}`, async () => {
        await mcpAsBob.cancel(protectionIndex)
        await expect(mcpAsSam.sell(protectionIndex)).to.be.revertedWith('MCP: SPSB')
      })

      fest(`must not allow to sell if protection is sold ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await expect(mcpAsSam.sell(protectionIndex)).to.be.revertedWith('MCP: SPSB')
      })

      fest(`must not allow to sell if protection is used ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await mcpAsBob.use(protectionIndex)
        await expect(mcpAsSam.sell(protectionIndex)).to.be.revertedWith('MCP: SPSB')
      })

      fest(`must not allow to sell if protection is withdrawn ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await setNextBlockTimestamp(expirationDate + 1)
        await mcpAsSam.withdraw(protectionIndex)
        await expect(mcpAsSam.sell(protectionIndex)).to.be.revertedWith('MCP: SPSB')
      })
    })

    describe(`cancel ${suffix}`, async () => {
      beforeEach(async () => {
        await mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, fee, payInBase)
      })

      fest(`must allow to cancel ${suffix}`, async () => {
        await mcpAsBob.cancel(protectionIndex)
        await expectSignerBalances([
          [bob, base, initialBaseAmount],
          [bob, quote, initialQuoteAmount],
          [sam, base, initialBaseAmount],
          [sam, quote, initialQuoteAmount],
          [mark, base, initialBaseAmount],
          [mark, quote, initialQuoteAmount],
        ])
      })

      fest(`must not allow to cancel if sender is not buyer ${suffix}`, async () => {
        await expect(mcpAsSam.cancel(protectionIndex)).to.be.revertedWith('MCP: CPBS')
      })

      fest(`must not allow to cancel if cancellationTimeout has passed ${suffix}`, async () => {
        await setNextBlockTimestamp(expirationDate + cancellationTimeout + 1)
        await expect(mcpAsBob.cancel(protectionIndex)).to.be.revertedWith('MCP: CPCT')
      })

      fest(`must not allow to cancel if protection does not exist ${suffix}`, async () => {
        await expect(mcpAsBob.cancel(protectionIndex + 1)).to.be.revertedWith('revert')
      })

      fest(`must not allow to cancel if protection is cancelled ${suffix}`, async () => {
        await mcpAsBob.cancel(protectionIndex)
        await expect(mcpAsBob.cancel(protectionIndex)).to.be.revertedWith('MCP: CPSB')
      })

      fest(`must not allow to cancel if protection is sold ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await expect(mcpAsBob.cancel(protectionIndex)).to.be.revertedWith('MCP: CPSB')
      })

      fest(`must not allow to cancel if protection is used ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await mcpAsBob.use(protectionIndex)
        await expect(mcpAsBob.cancel(protectionIndex)).to.be.revertedWith('MCP: CPSB')
      })

      fest(`must not allow to cancel if protection is withdrawn ${suffix}`, async () => {
        await mcpAsSam.sell(protectionIndex)
        await setNextBlockTimestamp(expirationDate + 1)
        await mcpAsSam.withdraw(protectionIndex)
        await expect(mcpAsBob.cancel(protectionIndex)).to.be.revertedWith('MCP: CPSB')
      })

    })

    describe(`use ${suffix}`, async () => {
      beforeEach(async () => {
        await mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, fee, payInBase)
        await mcpAsSam.sell(protectionIndex)
      })

      fest(`must allow to use ${suffix}`, async () => {
        await mcpAsBob.use(protectionIndex)
        await expectSignerBalances([
          [bob, base, initialBaseAmount - (payInBase ? premium + fee : 0) - guaranteedAmount],
          [bob, quote, initialQuoteAmount - (!payInBase ? premium + fee : 0) + coverage],
          [sam, base, initialBaseAmount + (payInBase ? premium : 0)],
          [sam, quote, initialQuoteAmount + (!payInBase ? premium : 0) - coverage],
          [mark, base, initialBaseAmount + (payInBase ? fee : 0)],
          [mark, quote, initialQuoteAmount + (!payInBase ? fee : 0)],
        ])
      })

      fest(`must not allow to use if sender is not buyer ${suffix}`, async () => {
        await expect(mcpAsSam.use(protectionIndex)).to.be.revertedWith('MCP: UPBS')
      })

      fest(`must not allow to use if protection has expired ${suffix}`, async () => {
        await setNextBlockTimestamp(expirationDate + 1)
        await expect(mcpAsBob.use(protectionIndex)).to.be.revertedWith('MCP: UPET')
      })

      fest(`must not allow to use if protection does not exist ${suffix}`, async () => {
        await expect(mcpAsBob.use(protectionIndex + 1)).to.be.revertedWith('revert')
      })

      fest(`must allow to use if protection is not cancelled ${suffix}`, async () => {
        await expect(mcpAsBob.cancel(protectionIndex)).to.be.revertedWith('MCP: CPSB')
        await mcpAsBob.use(protectionIndex)
      })

      fest(`must allow to use before expirationDate if protection is sold ${suffix}`, async () => {
        await mcpAsBob.use(protectionIndex)
      })

      fest(`must not allow to use if protection is used ${suffix}`, async () => {
        await mcpAsBob.use(protectionIndex)
        await expect(mcpAsBob.use(protectionIndex)).to.be.revertedWith('MCP: UPSS')
      })

      fest(`must not allow to use if protection is withdrawn ${suffix}`, async () => {
        await setNextBlockTimestamp(expirationDate + 1)
        await mcpAsSam.withdraw(protectionIndex)
        await expect(mcpAsBob.use(protectionIndex)).to.be.revertedWith('MCP: UPSS')
      })
    })

    describe(`withdraw ${suffix}`, async () => {
      beforeEach(async () => {
        await mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, fee, payInBase)
        await mcpAsSam.sell(protectionIndex)
      })

      fest(`must allow to withdraw after use without waiting for expiration ${suffix}`, async () => {
        await mcpAsBob.use(protectionIndex)
        await expect(getLatestBlockTimestamp(ethers)).to.eventually.be.lessThan(expirationDate)
        await mcpAsSam.withdraw(protectionIndex)
        await expectSignerBalances([
          [bob, base, initialBaseAmount - (payInBase ? premium + fee : 0) - guaranteedAmount],
          [bob, quote, initialQuoteAmount - (!payInBase ? premium + fee : 0) + coverage],
          [sam, base, initialBaseAmount + (payInBase ? premium : 0) + guaranteedAmount],
          [sam, quote, initialQuoteAmount + (!payInBase ? premium : 0) - coverage],
          [mark, base, initialBaseAmount + (payInBase ? fee : 0)],
          [mark, quote, initialQuoteAmount + (!payInBase ? fee : 0)],
        ])

      })

      fest(`must allow to withdraw after expiration ${suffix}`, async () => {
        await setNextBlockTimestamp(expirationDate + 1)
        await mcpAsSam.withdraw(protectionIndex)
        await expectSignerBalances([
          [bob, base, initialBaseAmount - (payInBase ? premium + fee : 0)],
          [bob, quote, initialQuoteAmount - (!payInBase ? premium + fee : 0)],
          [sam, base, initialBaseAmount + (payInBase ? premium : 0)],
          [sam, quote, initialQuoteAmount + (!payInBase ? premium : 0) - coverage + coverage],
          [mark, base, initialBaseAmount + (payInBase ? fee : 0)],
          [mark, quote, initialQuoteAmount + (!payInBase ? fee : 0)],
        ])
      })

      fest(`must not allow to withdraw if sender is not seller ${suffix}`, async () => {
        await mcpAsBob.use(protectionIndex)
        await expect(mcpAsBob.withdraw(protectionIndex)).to.be.revertedWith('MCP: WPSS')
      })

      fest(`must not allow to withdraw if protection does not exist ${suffix}`, async () => {
        await expect(mcpAsSam.withdraw(protectionIndex + 1)).to.be.revertedWith('revert')
      })

      fest(`must not allow to withdraw if protection is cancelled ${suffix}`, async () => {
        const protectionIndexNext = protectionIndex + 1
        await mcpAsBob.buy(baseAddress, quoteAddress, sellerAddress, guaranteedAmount, guaranteedPrice, expirationDate, premium, fee, payInBase)
        await mcpAsBob.cancel(protectionIndexNext)
        await expect(mcpAsSam.withdraw(protectionIndexNext)).to.be.revertedWith('MCP: WPSU')
      })

      fest(`must not allow to withdraw if protection is sold but expiration date has not been reached ${suffix}`, async () => {
        await expect(mcpAsSam.withdraw(protectionIndex)).to.be.revertedWith('MCP: WPET')
      })

      fest(`must not allow to withdraw if protection is withdrawn ${suffix}`, async () => {
        await setNextBlockTimestamp(expirationDate + 1)
        await mcpAsSam.withdraw(protectionIndex)
        await expect(mcpAsSam.withdraw(protectionIndex)).to.be.revertedWith('MCP: WPSU')
      })
    })
  }

  fest('must allow the owner to set feeDivisorMin', async () => {
    await mcpAsMark.setFeeDivisorMin(2)
  })

  fest('must not allow the owner to set feeDivisorMin to zero', async () => {
    await expect(mcpAsMark.setFeeDivisorMin(0)).to.be.revertedWith('MCP: SFSM')
  })

  fest('must not allow non-owner to set feeDivisorMin', async () => {
    await expect(mcpAsBob.setFeeDivisorMin(2)).to.be.revertedWith('not the owner')
  })

  fest('must allow the owner to set cancellationTimeout', async () => {
    await mcpAsMark.setCancellationTimeout(2)
  })

  fest('must not allow the owner to set cancellationTimeout to zero', async () => {
    await expect(mcpAsMark.setCancellationTimeout(0)).to.be.revertedWith('MCP: SCTM')
  })

  fest('must not allow non-owner to set cancellationTimeout', async () => {
    await expect(mcpAsBob.setCancellationTimeout(2)).to.be.revertedWith('not the owner')
  })

  // TODO: must not allow the developer to deploy an MCP contract with invalid base & quote addresses
  // TODO: must not allow to do anything with a cancelled protection
  // TODO: must not allow to buy/sell protection for toxic tokens that don't transfer the full amount (e.g. Salmonella)
  // TODO: should allow automatic ETH -> WETH conversion like on Uniswap

  // fest.skip("must pass fast-check", async () => {
  //   const expirationDateMin = now
  //   const expirationDateMax = dateAdd(now, { years: 5 })
  //   const expirationDateMinPre = dateAdd(expirationDateMin, { seconds: -1 })
  //   const expirationDateMaxPost = dateAdd(expirationDateMax, { seconds: +1 })
  //   const allCommands = [
  //     record({
  //       buyer: constantFrom(bob.address, bella.address),
  //       seller: constantFrom(zero, sam.address, sally.address),
  //       guaranteedAmount: bigUintN(256).map((n) => BigNumber.from(n)),
  //       guaranteedPrice: bigUintN(256).map((n) => BigNumber.from(n)),
  //       expirationDate: oneof({ depthFactor: 0.9 }, date({ min: expirationDateMin, max: expirationDateMax }), constant(expirationDateMinPre), constant(expirationDateMaxPost)),
  //       protectionPrice: bigUintN(256).map((n) => BigNumber.from(n)),
  //     }).map((r) => new BuyCommand(
  //       r.buyer,
  //       r.seller,
  //       r.guaranteedAmount,
  //       r.guaranteedPrice,
  //       r.expirationDate,
  //       r.protectionPrice,
  //     )),
  //
  //     // constant(new SellCommand()),
  //     // constant(new UseCommand()),
  //     // constant(new CancelCommand()),
  //     // constant(new WithdrawCommand()),
  //   ]
  //   await assert(
  //     asyncProperty(commands(allCommands, { maxCommands: 10 }), context(), async (cmds, ctx) => {
  //       ctx.log("Running cmds")
  //       const snapshot = await ethers.provider.send("evm_snapshot", [])
  //       try {
  //         const metronome = new TestMetronome(now)
  //         const setup = () => ({
  //           model: new MCPBlockchainModel(metronome, baseTokenModel, quoteTokenModel),
  //           real: new MCPBlockchainReal(mcpAsMark, baseAsOwner, quoteAsOwner),
  //         })
  //         await asyncModelRun(setup, cmds)
  //       } finally {
  //         await ethers.provider.send("evm_revert", [snapshot])
  //       }
  //     }),
  //   )
  // })
})
