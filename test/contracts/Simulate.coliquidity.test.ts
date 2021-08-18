import { expect } from "../../util/expect"
import { flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { MaxUint256, scale } from "../support/all.helpers"
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot, zero } from "../support/test.helpers"
import { BaseToken, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from "../../typechain"
import { TokenModel } from "./MCP/MCPBlockchainModel"
import { BigNumber, Contract } from "ethers"
import { beforeEach, Context } from "mocha"
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory } from "../support/Uniswap.helpers"
import { addLiquidityFromSam, buyFromBob, calculateProfitFromAlice, logBalances, tradeFromBobInCycle } from "../support/Coliquidity.helpers"

describe("Coliquidity", async function() {
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

  let quote: QuoteToken
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

  const baseTotalAmount = BigNumber.from("1000000000000").mul(scale)
  const quoteTotalAmount = BigNumber.from("1000000000").mul(scale)
  const baseInitialAmount = BigNumber.from("100000000").mul(scale)
  const quoteInitialAmount = BigNumber.from("100").mul(scale)

  const liquidityRatio = BigNumber.from("5")
  const depositRatio = BigNumber.from("10")
  const pumpRatio = BigNumber.from("10")

  const baseLiquidity = BigNumber.from("20000000").mul(scale)
  const quoteLiquidity = BigNumber.from("80").mul(scale)
  const priceInverse = baseLiquidity.div(quoteLiquidity)

  let snapshot: unknown

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

  beforeEach(async function() {
    snapshot = await getSnapshot()
  })

  afterEach(async function() {
    await revertToSnapshot([snapshot])
  })

  it(`must calculate coliquidity profit`, async function(this: Context) {
    this.timeout(300000)

    console.log("addLiquidity from sam")
    await addLiquidityFromSam(baseInitialAmount, liquidityRatio, quoteInitialAmount, router, sam, base, quote)
    await logBalances(base, quote, alice, bob, sam)

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
    await logBalances(base, quote, alice, bob, sam)

    console.log("trade from bob in cycle")
    await tradeFromBobInCycle(base, quote, router, bob)
    await logBalances(base, quote, alice, bob, sam)

    console.log("buy from bob")
    await buyFromBob(quoteInitialAmount, pumpRatio, router, bob, base, quote)
    await logBalances(base, quote, alice, bob, sam)

    console.log("removeLiquidity from alice")
    await pair.connect(alice).approve(router.address, MaxUint256)
    await router.connect(alice).removeLiquidity(base.address, quote.address, pairBalanceOfAlice, 0, 0, alice.address, MaxUint256)
    await logBalances(base, quote, alice, bob, sam)

    await calculateProfitFromAlice("using coliquidity", quoteInitialAmount, base, quote, alice)
  })

})
