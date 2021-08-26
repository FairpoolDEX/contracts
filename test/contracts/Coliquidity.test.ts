import { DateTime } from "luxon"
import { expect } from "../../util/expect"
import { assert, asyncModelRun, constant, asyncProperty, commands, record, oneof, constantFrom, float, date, nat, bigUintN, integer, context, pre } from "fast-check"
import { toInteger, identity, flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, hours, MaxUint256, seconds, toTokenAmount, years } from "../support/all.helpers"
import { zero, getLatestBlockTimestamp, setNextBlockTimestamp, timeTravel, getSnapshot, revertToSnapshot, expectBalances } from "../support/test.helpers"
import { Coliquidity, BaseToken, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from "../../typechain"
import { BuyCommand } from "./MCP/commands/BuyCommand"
import { MCPBlockchainModel, TokenModel } from "./MCP/MCPBlockchainModel"
import { MCPBlockchainReal } from "./MCP/MCPBlockchainReal"
import { TestMetronome } from "../support/Metronome"
import { BigNumber, BigNumberish, Contract } from "ethers"
import { dateToTimestampSeconds } from "hardhat/internal/util/date"
import Base = Mocha.reporters.Base
import { beforeEach } from "mocha"
import { Address } from "../../util/types"
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory } from "../support/Uniswap.helpers"

describe("Coliquidity", async () => {
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
  let baseAsSally: BaseToken

  let quote: BaseToken
  let quoteAsOwner: QuoteToken
  let quoteAsStranger: QuoteToken
  let quoteAsBob: QuoteToken
  let quoteAsSam: QuoteToken
  let quoteAsSally: BaseToken

  let coliquidity: Coliquidity
  let coliquidityAsMark: Coliquidity
  let coliquidityAsSam: Coliquidity
  let coliquidityAsBob: Coliquidity
  let coliquidityAsSally: Coliquidity

  let now: Date

  let pair: UniswapV2Pair

  const feeDivisorMin = 100
  const cancellationTimeout = 6 * hours / 1000
  const totalBaseAmount = 1000000000000000
  const totalQuoteAmount = 1000000000000
  const initialBaseAmount = 1000000000000
  const initialQuoteAmount = 30000000000

  const getFee = (amount: number) => Math.trunc(amount / feeDivisorMin * 40)

  let snapshot: any

  // let WETH = { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }
  // let USDT = { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" }
  // let SHLD = { address: "0xd49efa7bc0d339d74f487959c573d518ba3f8437" }

  let baseAddress: Address
  let quoteAddress: Address
  let makerAmount: number
  let takerAmount: number
  let makerAmountDesired: number
  let takerAmountDesired: number
  let offerIndex: number
  let positionIndex: number

  before(async () => {
    const signers = [owner, stranger, mark, bob, sam, bella, sally] = await ethers.getSigners()
    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => initialBaseAmount)
    const quoteRecipients = signers.map((s) => s.address)
    const quoteAmounts = signers.map(() => initialQuoteAmount)

    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    baseAsOwner = (await upgrades.deployProxy(baseTokenFactory, [totalBaseAmount, baseRecipients, baseAmounts])) as unknown as BaseToken
    await baseAsOwner.deployed()
    base = baseAsOwner.connect(zero)
    baseAsStranger = baseAsOwner.connect(stranger)
    baseAsBob = baseAsOwner.connect(bob)
    baseAsSam = baseAsOwner.connect(sam)
    baseAsSally = baseAsOwner.connect(sally)

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    quoteAsOwner = (await upgrades.deployProxy(quoteTokenFactory, [totalQuoteAmount, quoteRecipients, quoteAmounts])) as unknown as QuoteToken
    await quoteAsOwner.deployed()
    quote = quoteAsOwner.connect(zero)
    quoteAsStranger = quoteAsOwner.connect(stranger)
    quoteAsBob = quoteAsOwner.connect(bob)
    quoteAsSam = quoteAsOwner.connect(sam)
    quoteAsSally = quoteAsOwner.connect(sally)

    const wethContractFactory = await getWETH9ContractFactory(ethers)
    const weth = await wethContractFactory.deploy() as WETH9

    const UniswapV2FactoryContractFactory = await getUniswapV2FactoryContractFactory(ethers)
    const factory = await UniswapV2FactoryContractFactory.deploy(owner.address) as UniswapV2Factory

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    const router = await UniswapV2Router02ContractFactory.deploy(factory.address, weth.address) as UniswapV2Router02

    pair = await deployUniswapPair(factory, base as Contract, quote as Contract, ethers) as UniswapV2Pair

    const coliquidityFactory = await ethers.getContractFactory("Coliquidity")
    coliquidityAsMark = (await coliquidityFactory.connect(mark).deploy(router.address, weth.address)) as unknown as Coliquidity
    coliquidity = coliquidityAsMark.connect(zero)
    coliquidityAsBob = coliquidityAsMark.connect(bob)
    coliquidityAsSam = coliquidityAsMark.connect(sam)
    coliquidityAsSally = coliquidityAsMark.connect(sally)

    const approvals = flatten([bob, sam, bella, sally].map((signer) => [
      baseAsOwner.connect(signer).approve(coliquidityAsMark.address, initialBaseAmount),
      quoteAsOwner.connect(signer).approve(coliquidityAsMark.address, initialQuoteAmount),
    ]))
    await Promise.all(approvals)

    now = new Date(await getLatestBlockTimestamp() * 1000)

    baseAddress = base.address
    quoteAddress = quote.address
    makerAmount = 1000000
    takerAmount = 50000
    makerAmountDesired = 10000
    takerAmountDesired = 500
    offerIndex = 0
    positionIndex = 0
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  it("must allow to create an offer", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], 0)
    await expectBalances([
      [bob, base, initialBaseAmount - makerAmount],
      [bob, quote, initialQuoteAmount],
      [sam, base, initialBaseAmount],
      [sam, quote, initialQuoteAmount],
      [mark, base, initialBaseAmount],
      [mark, quote, initialQuoteAmount],
      [coliquidity, base, makerAmount],
      [coliquidity, quote, 0],
      [pair, base, 0],
      [pair, quote, 0],
    ])
  })

  it("must not allow to create an offer with invalid data", async () => {
    await expect(coliquidityAsBob.createOffer(zero, makerAmount, zero, [quoteAddress], 0)).to.be.revertedWith("Coliquidity: COTNZ")
    await expect(coliquidityAsBob.createOffer(baseAddress, 0, zero, [quoteAddress], 0)).to.be.revertedWith("Coliquidity: COAGZ")
    await expect(coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [], 0)).to.be.revertedWith("Coliquidity: COPLG")
    await expect(coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], 1)).to.be.revertedWith("Coliquidity: COLBT")
  })

  // it("must allow to create multiple positions", async () => {
  //   await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], 0)
  //   await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
  //   await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 2 * makerAmountDesired, 2 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)
  //   await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, 1, makerAmountDesired * 0.99, 1, MaxUint256)).to.be.revertedWith("unknown")
  //   await expectBalances([
  //     [bob, base, initialBaseAmount - makerAmount],
  //     [bob, quote, initialQuoteAmount],
  //     [sam, base, initialBaseAmount],
  //     [sam, quote, initialQuoteAmount],
  //     [mark, base, initialBaseAmount],
  //     [mark, quote, initialQuoteAmount],
  //     [coliquidity, base, makerAmount],
  //     [coliquidity, quote, 0],
  //   ])
  // })

  it("must not allow to create a position with invalid data", async () => {

  })

  it("must allow the owner to set fee", async () => {
    await coliquidityAsMark.setFee(5, 100)
  })

  it("must not allow the owner to set fee to zero", async () => {
    await expect(coliquidityAsMark.setFee(0, 1)).to.be.revertedWith("Coliquidity: SFNZ")
    await expect(coliquidityAsMark.setFee(1, 0)).to.be.revertedWith("Coliquidity: SFDZ")
  })

  it("must not allow non-owner to set fee", async () => {
    await expect(coliquidityAsBob.setFee(1, 100)).to.be.revertedWith("not the owner")
  })


})
