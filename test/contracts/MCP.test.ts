import { DateTime } from "luxon"
import { expect } from "../../util/expect"
import { assert, asyncModelRun, constant, asyncProperty, commands, record, oneof, constantFrom, float, date, nat, bigUintN, integer, context } from "fast-check"
import { toInteger, identity, flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, toTokenAmount, years } from "../support/all.helpers"
import { getLatestBlockTimestamp, setNextBlockTimestamp, timeTravel } from "../support/test.helpers"
import { Mcp as MCP, QuoteToken, BaseToken } from "../../typechain"
import { BuyCommand } from "./MCP/commands/BuyCommand"
import { MCPBlockchainModel, TokenModel } from "./MCP/MCPBlockchainModel"
import { MCPBlockchainReal } from "./MCP/MCPBlockchainReal"
import { TestMetronome } from "../support/Metronome"
import { BigNumber } from "ethers"
import { dateToTimestampSeconds } from "hardhat/internal/util/date"

/**
 * Contract-pair design:
 * - One contract per pair
 *   - And no need for upgradeable proxy
 *   - And easier to understand (mimics the Uniswap design)
 *   - And can be deployed by anyone, so we won't have to pay the deployment fees
 *   - But can run out of memory
 *   - But there can be multiple pair contacts
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
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let bella: SignerWithAddress
  let sally: SignerWithAddress

  const zero = "0x0000000000000000000000000000000000000000"

  let baseAsOwner: BaseToken
  let baseAsStranger: BaseToken

  let quoteAsOwner: QuoteToken
  let quoteStranger: QuoteToken

  let mcpAsOwner: MCP
  let mcpAsSam: MCP
  let mcpAsBob: MCP

  let baseTokenModel: TokenModel
  let quoteTokenModel: TokenModel

  let now: Date

  // let WETH = { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }
  // let USDT = { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" }
  // let SHLD = { address: "0xd49efa7bc0d339d74f487959c573d518ba3f8437" }

  beforeEach(async () => {
    const signers = [owner, stranger, bob, sam, bella, sally] = await ethers.getSigners()
    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => 10000)
    const quoteRecipients = baseRecipients.map(identity)
    const quoteAmounts = baseAmounts.map((a) => a / 100)
    baseTokenModel = { balanceByAddress: fromPairs(zip(baseRecipients, baseAmounts)) }
    quoteTokenModel = { balanceByAddress: fromPairs(zip(quoteRecipients, quoteAmounts)) }

    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    baseAsOwner = (await upgrades.deployProxy(baseTokenFactory, [baseRecipients, baseAmounts])) as unknown as BaseToken
    await baseAsOwner.deployed()
    baseAsStranger = baseAsOwner.connect(stranger)

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    quoteAsOwner = (await upgrades.deployProxy(quoteTokenFactory, [quoteRecipients, quoteAmounts])) as unknown as QuoteToken
    await quoteAsOwner.deployed()
    quoteStranger = quoteAsOwner.connect(stranger)

    const mcpFactory = await ethers.getContractFactory("MCP")
    mcpAsOwner = (await mcpFactory.deploy(baseAsOwner.address, quoteAsOwner.address, 50)) as unknown as MCP
    mcpAsBob = mcpAsOwner.connect(bob)
    mcpAsSam = mcpAsOwner.connect(sam)

    const approvals = flatten([bob, sam, bella, sally].map((signer) => [
      baseAsOwner.connect(signer).approve(mcpAsOwner.address, 10000),
      quoteAsOwner.connect(signer).approve(mcpAsOwner.address, 10000),
    ]))
    await Promise.all(approvals)

    now = new Date(await getLatestBlockTimestamp() * 1000)
  })

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
            real: new MCPBlockchainReal(mcpAsOwner, baseAsOwner, quoteAsOwner),
          })
          await asyncModelRun(setup, cmds)
        } finally {
          await ethers.provider.send("evm_revert", [snapshot])
        }
      }),
    )
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
})
