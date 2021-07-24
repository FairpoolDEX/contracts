import chai from "chai"
import { identity, flatten } from "lodash"
import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { toTokenAmount } from "../support/all.helpers"
import { getLatestBlockTimestamp, timeTravel } from "../support/test.helpers"
import { Mcp as MCP, QuoteToken, BaseToken } from "../../typechain"

chai.use(solidity)
const { expect } = chai

/**
 * Events
 * - LP offers protection
 * - Trader buys protection
 * - Trader uses protection
 * - LP withdraws the protection result
 * - LP forwards liquidity (to Yearn)
 */

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
  let dean: SignerWithAddress
  let phil: SignerWithAddress
  let ted: SignerWithAddress

  let baseOwner: BaseToken
  let baseStranger: BaseToken

  let quoteOwner: QuoteToken
  let quoteStranger: QuoteToken

  let mcpDean: MCP
  let mcpPhil: MCP
  let mcpTed: MCP

  let now: number

  // let WETH = { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }
  // let USDT = { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" }
  // let SHLD = { address: "0xd49efa7bc0d339d74f487959c573d518ba3f8437" }

  beforeEach(async () => {
    const signers = await ethers.getSigners()
    const [owner, stranger, dean, phil, ted] = signers
    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => 10000)
    const quoteRecipients = baseRecipients.map(identity)
    const quoteAmounts = baseAmounts.map((a) => a / 100)

    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    baseOwner = (await upgrades.deployProxy(baseTokenFactory, [baseRecipients, baseAmounts])) as unknown as BaseToken
    await baseOwner.deployed()
    baseStranger = baseOwner.connect(stranger)

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    quoteOwner = (await upgrades.deployProxy(quoteTokenFactory, [quoteRecipients, quoteAmounts])) as unknown as QuoteToken
    await quoteOwner.deployed()
    quoteStranger = quoteOwner.connect(stranger)

    const mcpFactory = await ethers.getContractFactory("MCP")
    mcpDean = (await mcpFactory.deploy(baseOwner.address, quoteOwner.address)) as unknown as MCP
    mcpPhil = mcpDean.connect(phil)
    mcpTed = mcpDean.connect(ted)

    const approvals = flatten([dean, phil, ted].map((signer) => [
      baseOwner.connect(signer).approve(mcpDean.address, 10000),
      quoteOwner.connect(signer).approve(mcpDean.address, 10000),
    ]))
    await Promise.all(approvals)

    now = await getLatestBlockTimestamp()
  })

  it("must allow the provider to offer protection", async () => {
    // TODO: ensure that at least `total` quantity is approved for transfer in quote token contract
    // await mcpPhil.provide(1000, 15, 2, now + 10000)
  })

  it("must not allow the provider to offer protection if he doesn't have enough quote asset", async () => {

  })

  it("must allow the trader to buy protection", async () => {

  })

  it("must allow the trader to sell token", async () => {

  })

  it("must not allow the trader to claim more protection than he has bought", async () => {

  })

  it("must not allow the provider to withdraw twice", async () => {

  })

  it("should not allow the developer to deploy an MCP contract with invalid base & quote addresses", async () => {
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
