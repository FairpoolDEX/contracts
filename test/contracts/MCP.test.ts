import { DateTime } from "luxon"
import { expect } from "../../util/expect"
import { assert, asyncModelRun, constant, asyncProperty, commands, record, oneof, constantFrom, float, date, nat, bigUintN, integer, context, pre } from "fast-check"
import { toInteger, identity, flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, toTokenAmount, years } from "../support/all.helpers"
import { zero, getLatestBlockTimestamp, setNextBlockTimestamp, timeTravel, getSnapshot, revertToSnapshot, expectBalances } from "../support/test.helpers"
import { Mcp as MCP, QuoteToken, BaseToken, Mcp } from "../../typechain"
import { BuyCommand } from "./MCP/commands/BuyCommand"
import { MCPBlockchainModel, TokenModel } from "./MCP/MCPBlockchainModel"
import { MCPBlockchainReal } from "./MCP/MCPBlockchainReal"
import { TestMetronome } from "../support/Metronome"
import { BigNumber, BigNumberish } from "ethers"
import { dateToTimestampSeconds } from "hardhat/internal/util/date"
import Base = Mocha.reporters.Base
import { beforeEach } from "mocha"
import { Address } from "../../types"

/**
 * Contract-pair design:
 * - One contract per pair
 *   - And no need for upgradeable proxy
 *   - And easier to understand (mimics the Uniswap design)
 *   - And can be deployed by anyone, so we won't have to pay the deployment fees
 *   - But there can be multiple contacts for a single pair
 *     - But that's not a problem
 * - One contract for all pairs
 *   - And easier to manage
 *   - But harder to implement
 */

describe("Market Crash Protection", async () => {
  /**
   * Username:
   * - Must start with a marker letter
   *
   * Marker letter
   * - Must represent a user type
   *   - Developer
   *   - Provider
   *   - Trader
   */
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let mark: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let bella: SignerWithAddress
  let sally: SignerWithAddress

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

  const feeNumerator = 50
  const feeDenominator = 10000
  const totalBaseAmount = 1000000000
  const totalQuoteAmount = 1000000
  const initialBaseAmount = 1000000
  const initialQuoteAmount = 30000

  const getFee = (amount: number) => Math.trunc(amount * feeNumerator / feeDenominator)

  let snapshot: any

  // let WETH = { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }
  // let USDT = { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" }
  // let SHLD = { address: "0xd49efa7bc0d339d74f487959c573d518ba3f8437" }

  let seller: Address
  let guaranteedAmount: number
  let guaranteedPrice: number
  let expirationDate: number
  let protectionPrice: number
  let coverage: number
  let premium: number
  let fee: number
  let protectionIndex: number

  before(async () => {
    const signers = [owner, stranger, mark, bob, sam, bella, sally] = await ethers.getSigners()
    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => initialBaseAmount)
    const quoteRecipients = signers.map((s) => s.address)
    const quoteAmounts = signers.map(() => initialQuoteAmount)
    baseTokenModel = { balanceByAddress: fromPairs(zip(baseRecipients, baseAmounts)) }
    quoteTokenModel = { balanceByAddress: fromPairs(zip(quoteRecipients, quoteAmounts)) }

    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    baseAsOwner = (await upgrades.deployProxy(baseTokenFactory, [totalBaseAmount, baseRecipients, baseAmounts])) as unknown as BaseToken
    await baseAsOwner.deployed()
    base = baseAsOwner.connect(zero)
    baseAsStranger = baseAsOwner.connect(stranger)
    baseAsBob = baseAsOwner.connect(bob)
    baseAsSam = baseAsOwner.connect(sam)

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    quoteAsOwner = (await upgrades.deployProxy(quoteTokenFactory, [totalQuoteAmount, quoteRecipients, quoteAmounts])) as unknown as QuoteToken
    await quoteAsOwner.deployed()
    quote = quoteAsOwner.connect(zero)
    quoteAsStranger = quoteAsOwner.connect(stranger)
    quoteAsBob = quoteAsOwner.connect(bob)
    quoteAsSam = quoteAsOwner.connect(sam)

    const mcpFactory = await ethers.getContractFactory("MCP")
    mcpAsMark = (await mcpFactory.connect(mark).deploy(baseAsOwner.address, quoteAsOwner.address, feeNumerator)) as unknown as MCP
    mcp = mcpAsMark.connect(zero)
    mcpAsBob = mcpAsMark.connect(bob)
    mcpAsSam = mcpAsMark.connect(sam)

    const approvals = flatten([bob, sam, bella, sally].map((signer) => [
      baseAsOwner.connect(signer).approve(mcpAsMark.address, initialBaseAmount),
      quoteAsOwner.connect(signer).approve(mcpAsMark.address, initialBaseAmount),
    ]))
    await Promise.all(approvals)

    now = new Date(await getLatestBlockTimestamp() * 1000)

    seller = sam.address
    guaranteedAmount = 100
    guaranteedPrice = 5
    expirationDate = dateToTimestampSeconds(now) + 100
    protectionPrice = 2
    coverage = guaranteedAmount * guaranteedPrice
    premium = guaranteedAmount * protectionPrice
    fee = getFee(premium)
    protectionIndex = 0
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  describe("buy", async () => {
    it("must allow to buy", async () => {
      await mcpAsBob.buy(seller, guaranteedAmount, guaranteedPrice, expirationDate, protectionPrice)
      await expectBalances([
        [bob, base, initialBaseAmount],
        [bob, quote, initialQuoteAmount - premium - fee],
        [sam, base, initialBaseAmount],
        [sam, quote, initialQuoteAmount],
        [mark, base, initialBaseAmount],
        [mark, quote, initialQuoteAmount],
      ])
    })

    it("must not allow to buy if expiration date is less than block timestamp", async () => {
      expect(mcpAsBob.buy(seller, guaranteedAmount, guaranteedPrice, dateToTimestampSeconds(now) - 1, protectionPrice)).to.be.revertedWith("BEXP")
    })

    it("must not allow to buy if buyer doesn't have enough balance", async () => {
      expect(mcpAsBob.buy(seller, guaranteedAmount, guaranteedPrice, expirationDate, protectionPrice + initialQuoteAmount)).to.be.revertedWith("transfer amount exceeds balance")
    })
  })

  describe("sell", async () => {
    beforeEach(async () => {
      await mcpAsBob.buy(seller, guaranteedAmount, guaranteedPrice, expirationDate, protectionPrice)
    })

    it("must allow to sell", async () => {
      await mcpAsSam.sell(protectionIndex)
      await expectBalances([
        [bob, base, initialBaseAmount],
        [bob, quote, initialQuoteAmount - premium - fee],
        [sam, base, initialBaseAmount],
        [sam, quote, initialQuoteAmount - coverage + premium],
        [mark, base, initialBaseAmount],
        [mark, quote, initialQuoteAmount + fee],
      ])
      // expect(await baseAsOwner.balanceOf(bob.address)).to.equal(initialBaseAmount)
      // expect(await quoteAsOwner.balanceOf(bob.address)).to.equal(initialQuoteAmount - premium - fee)
      // expect(await baseAsOwner.balanceOf(sam.address)).to.equal(initialBaseAmount)
      // expect(await quoteAsOwner.balanceOf(sam.address)).to.equal(initialQuoteAmount)
    })

    it("must not allow to sell if seller doesn't have enough balance", async () => {

    })

    it("must not allow to sell if seller address is different from specified address", async () => {
      expect(mcpAsMark.sell(protectionIndex)).to.be.revertedWith("SPSS")
    })

    it("must not allow to sell if protection does not exist", async () => {

    })

    it("must not allow to sell if protection is cancelled", async () => {

    })

    it("must not allow to sell if protection is sold", async () => {

    })

    it("must not allow to sell if protection is used", async () => {

    })

    it("must not allow to sell if protection is withdrawn", async () => {

    })
  })
  xit("must not allow the provider to offer protection if he doesn't have enough quote asset", async () => {

  })

  xit("must allow the trader to buy protection", async () => {

  })

  xit("must allow the trader to sell token", async () => {

  })

  xit("must not allow the trader to claim more protection than he has bought", async () => {

  })

  xit("must not allow the provider to withdraw twice", async () => {

  })

  xit("should not allow the developer to deploy an MCP contract with invalid base & quote addresses", async () => {
    // TODO: test that a pair with non-ERC20 base address can't be deployed
    // TODO: test that a pair with non-ERC20 quote address can't be deployed
  })

  // TODO: must not allow to do anything with a cancelled protection
  // TODO: must take a fee
  // TODO: must allow the owner to withdraw the fees
  // TODO: must not allow the stranger to withdraw the fees
  // TODO: must not transfer the fee to the owner before the sale
  // TODO: must return the fee if the protection is cancelled
  // TODO: must not allow to buy/sell protection for toxic tokens that don't transfer the full amount (e.g. Salmonella)

  xit("must pass fast-check", async () => {
    const expirationDateMin = now
    const expirationDateMax = dateAdd(now, { years: 5 })
    const expirationDateMinPre = dateAdd(expirationDateMin, { seconds: -1 })
    const expirationDateMaxPost = dateAdd(expirationDateMax, { seconds: +1 })
    const allCommands = [
      record({
        buyer: constantFrom(bob.address, bella.address),
        seller: constantFrom(zero, sam.address, sally.address),
        guaranteedAmount: bigUintN(256).map((n) => BigNumber.from(n)),
        guaranteedPrice: bigUintN(256).map((n) => BigNumber.from(n)),
        expirationDate: oneof({ depthFactor: 0.9 }, date({ min: expirationDateMin, max: expirationDateMax }), constant(expirationDateMinPre), constant(expirationDateMaxPost)),
        protectionPrice: bigUintN(256).map((n) => BigNumber.from(n)),
      }).map((r) => new BuyCommand(
        r.buyer,
        r.seller,
        r.guaranteedAmount,
        r.guaranteedPrice,
        r.expirationDate,
        r.protectionPrice,
      )),

      // constant(new SellCommand()),
      // constant(new UseCommand()),
      // constant(new CancelCommand()),
      // constant(new WithdrawCommand()),
    ]
    await assert(
      asyncProperty(commands(allCommands, { maxCommands: 10 }), context(), async (cmds, ctx) => {
        ctx.log("Running cmds")
        const snapshot = await ethers.provider.send("evm_snapshot", [])
        try {
          const metronome = new TestMetronome(now)
          const setup = () => ({
            model: new MCPBlockchainModel(metronome, baseTokenModel, quoteTokenModel),
            real: new MCPBlockchainReal(mcpAsMark, baseAsOwner, quoteAsOwner),
          })
          await asyncModelRun(setup, cmds)
        } finally {
          await ethers.provider.send("evm_revert", [snapshot])
        }
      }),
    )
  })
})
