import { DateTime } from "luxon"
import { expect } from "../../util/expect"
import { assert, asyncModelRun, constant, asyncProperty, commands, record, oneof, constantFrom, float, date, nat, bigUintN, integer, context, pre } from "fast-check"
import { toInteger, identity, flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, hours, MaxUint256, seconds, toTokenAmount, years } from "../support/all.helpers"
import { zero, getLatestBlockTimestamp, setNextBlockTimestamp, timeTravel, getSnapshot, revertToSnapshot, expectBalances } from "../support/test.helpers"
import { MCP, QuoteToken, BaseToken, IUniswapV2Factory, IUniswapV2Pair, UniswapV2Factory, UniswapV2Router02, UniswapV2Pair, WETH9 } from "../../typechain"
import { BuyCommand } from "./MCP/commands/BuyCommand"
import { MCPBlockchainModel, TokenModel } from "./MCP/MCPBlockchainModel"
import { MCPBlockchainReal } from "./MCP/MCPBlockchainReal"
import { TestMetronome } from "../support/Metronome"
import { BigNumber, BigNumberish, Contract } from "ethers"
import { dateToTimestampSeconds } from "hardhat/internal/util/date"
import { beforeEach } from "mocha"
import { Address } from "../../util/types"
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory, toAmountAfterFee } from "../support/Uniswap.helpers"

describe("Coliquidity", async () => {
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let alice: SignerWithAddress // MCP contract owner
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

  let weth: WETH9
  let factory: UniswapV2Factory
  let router: UniswapV2Router02
  let pair: UniswapV2Pair

  let baseTokenModel: TokenModel
  let quoteTokenModel: TokenModel

  let now: Date

  const cancellationTimeout = 6 * hours / 1000
  const baseTotalAmount = BigNumber.from("1000000000000000")
  const quoteTotalAmount = BigNumber.from("1000000000000")
  const baseInitialAmount = BigNumber.from("1000000000000")
  const quoteInitialAmount = BigNumber.from("30000000000")

  const liquidityRatio = BigNumber.from("5")
  const depositRatio = BigNumber.from("10")
  const pumpRatio = BigNumber.from("10")

  let snapshot: any

  // let WETH = { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }
  // let USDT = { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" }
  // let SHLD = { address: "0xd49efa7bc0d339d74f487959c573d518ba3f8437" }

  before(async () => {
    const signers = [owner, stranger, alice, bob, sam, bella, sally] = await ethers.getSigners()
    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => baseInitialAmount)
    const quoteRecipients = signers.map((s) => s.address)
    const quoteAmounts = signers.map(() => quoteInitialAmount)
    baseTokenModel = { balanceByAddress: fromPairs(zip(baseRecipients, baseAmounts)) }
    quoteTokenModel = { balanceByAddress: fromPairs(zip(quoteRecipients, quoteAmounts)) }

    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    baseAsOwner = (await upgrades.deployProxy(baseTokenFactory, [baseTotalAmount, baseRecipients, baseAmounts])) as unknown as BaseToken
    await baseAsOwner.deployed()
    base = baseAsOwner.connect(zero)
    baseAsStranger = baseAsOwner.connect(stranger)
    baseAsBob = baseAsOwner.connect(bob)
    baseAsSam = baseAsOwner.connect(sam)

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    quoteAsOwner = (await upgrades.deployProxy(quoteTokenFactory, [quoteTotalAmount, quoteRecipients, quoteAmounts])) as unknown as QuoteToken
    await quoteAsOwner.deployed()
    quote = quoteAsOwner.connect(zero)
    quoteAsStranger = quoteAsOwner.connect(stranger)
    quoteAsBob = quoteAsOwner.connect(bob)
    quoteAsSam = quoteAsOwner.connect(sam)

    const wethContractFactory = await getWETH9ContractFactory(ethers)
    weth = await wethContractFactory.deploy() as WETH9

    const UniswapV2FactoryContractFactory = await getUniswapV2FactoryContractFactory(ethers)
    factory = await UniswapV2FactoryContractFactory.deploy(owner.address) as UniswapV2Factory

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    router = await UniswapV2Router02ContractFactory.deploy(factory.address, weth.address) as UniswapV2Router02

    pair = await deployUniswapPair(factory, baseAsOwner as Contract, quoteAsOwner as Contract, ethers) as UniswapV2Pair

    const approvals = flatten([owner, stranger, alice, bob, sam, bella, sally].map((signer) => [
      baseAsOwner.connect(signer).approve(router.address, MaxUint256),
      quoteAsOwner.connect(signer).approve(router.address, MaxUint256),
    ]))
    await Promise.all(approvals)

    now = new Date(await getLatestBlockTimestamp() * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  it(`must calculate coliquidity profit`, async () => {
    console.log("addLiquidity from sam")
    const { baseLiquidity, quoteLiquidity, priceInverse } = await addLiquidityFromSam(baseInitialAmount, liquidityRatio, quoteInitialAmount, router, sam, base, quote)
    await logBalances()

    console.log("addLiquidity from alice")
    const baseDeposit = baseInitialAmount.div(depositRatio)
    const quoteDeposit = quoteInitialAmount.div(depositRatio)
    await router.connect(alice).addLiquidity(base.address, quote.address, baseDeposit, quoteDeposit, baseDeposit, quoteDeposit, alice.address, MaxUint256)
    const pairBalanceOfAlice = await pair.balanceOf(alice.address)
    const pairTotalSupply = await pair.totalSupply()
    const baseBalanceOfPair = await base.balanceOf(pair.address)
    const quoteBalanceOfPair = await quote.balanceOf(pair.address)
    const baseExpected = baseBalanceOfPair.mul(pairBalanceOfAlice).div(pairTotalSupply)
    const quoteExpected = quoteBalanceOfPair.mul(pairBalanceOfAlice).div(pairTotalSupply)
    await logBalances()

    console.log("trade from bob in cycle")
    await tradeFromBobInCycle(priceInverse, quoteLiquidity, baseLiquidity)
    await logBalances()

    console.log("buy from bob")
    await buyFromBob(quoteInitialAmount, pumpRatio, priceInverse, quoteLiquidity, baseLiquidity, router, bob, quote, base)
    await logBalances()

    console.log("removeLiquidity from alice")
    await pair.connect(alice).approve(router.address, MaxUint256)
    await router.connect(alice).removeLiquidity(base.address, quote.address, pairBalanceOfAlice, 0, 0, alice.address, MaxUint256)
    await logBalances()

    await calculateProfitFromAlice()
  })

  it(`must calculate buy profit`, async () => {
    console.log("addLiquidity from sam")
    const { baseLiquidity, quoteLiquidity, priceInverse } = await addLiquidityFromSam(baseInitialAmount, liquidityRatio, quoteInitialAmount, router, sam, base, quote)
    await logBalances()

    console.log("buy from alice")
    const baseDeposit = baseInitialAmount.div(depositRatio)
    const quoteDeposit = quoteInitialAmount.div(depositRatio)
    await router.connect(alice).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteDeposit, 0, [quote.address, base.address], alice.address, MaxUint256)
    const baseBought = (await base.balanceOf(alice.address)).sub(baseInitialAmount)
    expect(!baseBought.isNegative())
    await logBalances()

    console.log("trade from bob in cycle")
    await tradeFromBobInCycle(priceInverse, quoteLiquidity, baseLiquidity)
    await logBalances()

    console.log("buy from bob")
    await buyFromBob(quoteInitialAmount, pumpRatio, priceInverse, quoteLiquidity, baseLiquidity, router, bob, quote, base)
    await logBalances()

    console.log("sell from alice")
    await router.connect(alice).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseBought, 0, [base.address, quote.address], alice.address, MaxUint256)
    expect(await base.balanceOf(alice.address)).to.eq(baseInitialAmount)
    await logBalances()

    await calculateProfitFromAlice()
  })

  async function addLiquidityFromSam(baseInitialAmount: BigNumber, liquidityRatio: BigNumber, quoteInitialAmount: BigNumber, router: UniswapV2Router02, sam: SignerWithAddress, base: BaseToken, quote: BaseToken) {
    const baseLiquidity = baseInitialAmount.div(liquidityRatio)
    const quoteLiquidity = quoteInitialAmount.div(liquidityRatio)
    const priceInverse = baseLiquidity.div(quoteLiquidity)
    // console.log('baseLiquidity', baseLiquidity.toString())
    // console.log('quoteLiquidity', quoteLiquidity.toString())
    await router.connect(sam).addLiquidity(base.address, quote.address, baseLiquidity, quoteLiquidity, baseLiquidity, quoteLiquidity, sam.address, MaxUint256)
    return { baseLiquidity, quoteLiquidity, priceInverse }
  }

  async function tradeFromBobInCycle(priceInverse: BigNumber, quoteLiquidity: BigNumber, baseLiquidity: BigNumber) {
    for (let i = 0; i < 100; i++) {
      // console.log(`trade from bob ${i}`)
      const quoteTradeAmount = quoteInitialAmount.div(pumpRatio)
      const baseBalanceBefore = await base.balanceOf(bob.address)
      await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteTradeAmount, 0, [quote.address, base.address], bob.address, MaxUint256)
      const baseBalanceAfter = await base.balanceOf(bob.address)
      const baseTradeAmount = baseBalanceAfter.sub(baseBalanceBefore)
      await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseTradeAmount, 0, [base.address, quote.address], bob.address, MaxUint256)
    }
  }

  async function buyFromBob(quoteInitialAmount: BigNumber, pumpRatio: BigNumber, priceInverse: BigNumber, quoteLiquidity: BigNumber, baseLiquidity: BigNumber, router: UniswapV2Router02, bob: SignerWithAddress, quote: BaseToken, base: BaseToken) {
    const quoteIn = quoteInitialAmount.div(pumpRatio)
    // const basePumpOut = toAmountAfterFee(quotePumpIn).mul(priceInverse)
    // expect(quotePumpIn.lt(quoteLiquidity))
    // expect(basePumpOut.lt(baseLiquidity))
    // expect(basePumpOut.gt(quotePumpIn))
    // console.log('quotePumpIn.toString()', quotePumpIn.toString())
    // console.log('basePumpOut.toString()', basePumpOut.toString())
    await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteIn, 0, [quote.address, base.address], bob.address, MaxUint256)
    // expect(await base.balanceOf(bob.address)).to.be.gt(baseInitialAmount)
    // expect(await quote.balanceOf(bob.address)).to.be.lt(quoteInitialAmount)
  }

  async function sellFromBob(baseInitialAmount: BigNumber, pumpRatio: BigNumber, priceInverse: BigNumber, quoteLiquidity: BigNumber, baseLiquidity: BigNumber, router: UniswapV2Router02, bob: SignerWithAddress, quote: BaseToken, base: BaseToken) {
    const baseIn = baseInitialAmount.div(pumpRatio)
    await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseIn, 0, [base.address, quote.address], bob.address, MaxUint256)
  }

  async function calculateProfitFromAlice() {
    console.log("calculateProfit from alice")
    const quoteFinalAmount = await quote.balanceOf(alice.address)
    const profit = quoteFinalAmount.sub(quoteInitialAmount)
    console.info("profit", profit.toString())
  }

  async function logBalances() {
    console.dir({
      base: {
        "sam    ": (await base.balanceOf(sam.address)).toString().padStart(baseInitialAmount.toString().length),
        "alice   ": (await base.balanceOf(alice.address)).toString().padStart(baseInitialAmount.toString().length),
        "bob    ": (await base.balanceOf(bob.address)).toString().padStart(baseInitialAmount.toString().length),
      },
      quote: {
        "sam    ": (await quote.balanceOf(sam.address)).toString().padStart(baseInitialAmount.toString().length),
        "alice   ": (await quote.balanceOf(alice.address)).toString().padStart(baseInitialAmount.toString().length),
        "bob    ": (await quote.balanceOf(bob.address)).toString().padStart(baseInitialAmount.toString().length),
      },
    }, { compact: false })
  }

})
