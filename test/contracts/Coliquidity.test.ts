import { expect } from "../../util/expect"
import { flatten } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, hours, max, MaxUint256, sum } from "../support/all.helpers"
import { $zero, expectBalances, getLatestBlockTimestamp, getSnapshot, revertToSnapshot, zero } from "../support/test.helpers"
import { BaseToken, Coliquidity, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from "../../typechain"
import { BigNumber, BigNumberish, Contract } from "ethers"
import { beforeEach } from "mocha"
import { Address } from "../../util/types"
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory, uniswapMinimumLiquidity } from "../support/Uniswap.helpers"
import { getFee, getLiquidityAfterSell, subtractFee } from "../support/Coliquidity.helpers"
import $debug from "debug"
import { assert, asyncModelRun, asyncProperty, bigUintN, boolean, commands, constant, constantFrom, context, date, nat, oneof, record } from "fast-check"
import { TestMetronome } from "../support/Metronome"
import { ColiquidityBlockchainModel, ColiquidityBlockchainReal } from "./Coliquidity/ColiquidityCommand"
import { amount } from "../support/fast-check.helpers"
import { CreateOfferCommand } from "./Coliquidity/commands/CreateOfferCommand"

describe("Coliquidity", async function() {
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let owen: SignerWithAddress // MCP contract owner
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
  let coliquidityAsOwen: Coliquidity
  let coliquidityAsSam: Coliquidity
  let coliquidityAsBob: Coliquidity
  let coliquidityAsSally: Coliquidity

  let now: Date

  let factory: UniswapV2Factory
  let router: UniswapV2Router02
  let pair: UniswapV2Pair

  const feeNumerator = 1
  const feeDenominator = 100
  const cancellationTimeout = 6 * hours / 1000
  const totalBaseAmount = 1000000000000000
  const totalQuoteAmount = 1000000000000
  const initialBaseAmount = 1000000000000
  const initialQuoteAmount = 30000000000

  let snapshot: any

  let baseAddress: Address
  let quoteAddress: Address
  let makerAmount: number
  let takerAmount: number
  let makerAmountDesired: number
  let takerAmountDesired: number
  let offerIndex: number
  let positionIndex: number

  let baseAmountIn: number

  const debug = $debug(this.title)

  before(async () => {
    const signers = [owner, stranger, owen, bob, sam, bella, sally] = await ethers.getSigners()
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
    factory = await UniswapV2FactoryContractFactory.deploy(owner.address) as UniswapV2Factory

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    router = await UniswapV2Router02ContractFactory.deploy(factory.address, weth.address) as UniswapV2Router02

    pair = await deployUniswapPair(factory, base as Contract, quote as Contract, ethers) as UniswapV2Pair

    const coliquidityFactory = await ethers.getContractFactory("Coliquidity")
    coliquidityAsOwen = (await coliquidityFactory.connect(owen).deploy(router.address, factory.address, weth.address)) as unknown as Coliquidity
    coliquidity = coliquidityAsOwen.connect(zero)
    coliquidityAsBob = coliquidityAsOwen.connect(bob)
    coliquidityAsSam = coliquidityAsOwen.connect(sam)
    coliquidityAsSally = coliquidityAsOwen.connect(sally)

    await coliquidityAsOwen.setFee(feeNumerator, feeDenominator)

    const approvals = flatten([bob, sam, bella, sally].map((signer) => [
      baseAsOwner.connect(signer).approve(coliquidityAsOwen.address, initialBaseAmount),
      quoteAsOwner.connect(signer).approve(coliquidityAsOwen.address, initialQuoteAmount),
      baseAsOwner.connect(signer).approve(router.address, initialBaseAmount),
      quoteAsOwner.connect(signer).approve(router.address, initialQuoteAmount),
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

    baseAmountIn = 2000
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  it("must allow to create an offer", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await expectBalances([
      [bob, base, initialBaseAmount - makerAmount],
      [bob, quote, initialQuoteAmount],
      [sam, base, initialBaseAmount],
      [sam, quote, initialQuoteAmount],
      [sally, base, initialBaseAmount],
      [sally, quote, initialQuoteAmount],
      [owen, base, initialBaseAmount],
      [owen, quote, initialQuoteAmount],
      [coliquidity, base, makerAmount],
      [coliquidity, quote, 0],
      [pair, base, 0],
      [pair, quote, 0],
    ])
  })

  it("must not allow to create an offer with invalid data", async () => {
    await expect(coliquidityAsBob.createOffer(zero, makerAmount, zero, [quoteAddress], true, 0)).to.be.revertedWith("Coliquidity: COTNZ")
    await expect(coliquidityAsBob.createOffer(baseAddress, 0, zero, [quoteAddress], true, 0)).to.be.revertedWith("Coliquidity: COAGZ")
    await expect(coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [], true, 0)).to.be.revertedWith("Coliquidity: COPLG")
    await expect(coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 1)).to.be.revertedWith("Coliquidity: COLBT")
  })

  it("must allow to create multiple positions", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 2 * makerAmountDesired, 2 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)

    // must now allow sam to add liquidity at a different ratio
    await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, 1, makerAmountDesired * 0.99, 1, MaxUint256)).to.be.revertedWith("INSUFFICIENT_A_AMOUNT")

    await expectBalances([
      [bob, base, initialBaseAmount - makerAmount],
      [bob, quote, initialQuoteAmount],
      [sam, base, initialBaseAmount],
      [sam, quote, initialQuoteAmount - takerAmountDesired],
      [sally, base, initialBaseAmount],
      [sally, quote, initialQuoteAmount - 2 * takerAmountDesired],
      [owen, base, initialBaseAmount],
      [owen, quote, initialQuoteAmount],
      [coliquidity, base, makerAmount - makerAmountDesired - 2 * makerAmountDesired],
      [coliquidity, quote, 0],
      [pair, base, makerAmountDesired + 2 * makerAmountDesired],
      [pair, quote, takerAmountDesired + 2 * takerAmountDesired],
    ])
  })

  it("must not allow to create a position with invalid data", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, sam.address, [quoteAddress], true, 0)
    await expect(coliquidityAsSally.createPosition(offerIndex, quoteAddress, 2 * makerAmountDesired, 2 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)).to.be.revertedWith("CPAGD")
    await expect(coliquidityAsSam.createPosition(offerIndex, baseAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)).to.be.revertedWith("IDENTICAL_ADDRESSES")
    await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, 0, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)).to.be.revertedWith("ds-math-sub-underflow")
    await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, 0, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)).to.be.revertedWith("ds-math-sub-underflow")
    await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, totalBaseAmount, takerAmountDesired, totalBaseAmount * 0.99, takerAmountDesired * 0.99, MaxUint256)).to.be.revertedWith("TRANSFER_FROM_FAILED")
    await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, totalQuoteAmount, makerAmountDesired * 0.99, totalQuoteAmount * 0.99, MaxUint256)).to.be.revertedWith("TRANSFER_FROM_FAILED")
    await expect(coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, 1)).to.be.revertedWith("EXPIRED")
  })

  it("must allow to withdraw position with fees", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 4 * makerAmountDesired, 4 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)

    // NOTE: Solidity getter does not return takerTokens because it's an array
    const offerBobBefore = await coliquidity.offers(0)
    const offerBobTakerTokensBefore = await coliquidity.offersTakerTokens(0)
    const positionSamBefore = await coliquidity.positions(0)
    const positionSallyBefore = await coliquidity.positions(1)
    expect(Object.create(offerBobBefore)).to.deep.include({
      makerToken: base.address,
      maker: bob.address,
      makerAmount: BigNumber.from(makerAmount - makerAmountDesired - 4 * makerAmountDesired),
      taker: zero,
      reinvest: true,
      lockedUntil: $zero,
    })
    expect(offerBobTakerTokensBefore).to.have.members([quoteAddress])

    const liquidityTotalSupply = await pair.totalSupply()
    const token0 = await pair.token0()
    const token1 = await pair.token1()
    const [basePoolAmountBefore, quotePoolAmountBefore] = [makerAmountDesired + 4 * makerAmountDesired, takerAmountDesired + 4 * takerAmountDesired]
    const [reserve0Before, reserve1Before] = await pair.getReserves()
    expect(liquidityTotalSupply).to.equal(sum([positionSamBefore.liquidityAmount, positionSallyBefore.liquidityAmount]).add(uniswapMinimumLiquidity))
    expect(token0).to.equal(baseAddress)
    expect(token1).to.equal(quoteAddress)
    expect(reserve0Before).to.equal(basePoolAmountBefore)
    expect(reserve1Before).to.equal(quotePoolAmountBefore)

    const toSamShare = (value: BigNumberish) => BigNumber.from(value).mul(positionSamBefore.liquidityAmount).div(liquidityTotalSupply)
    const toSallyShare = (value: BigNumberish) => BigNumber.from(value).mul(positionSallyBefore.liquidityAmount).div(liquidityTotalSupply)
    const toPairShare = (value: BigNumberish) => BigNumber.from(value).mul(uniswapMinimumLiquidity).div(liquidityTotalSupply)
    // IMPORTANT: Sam has less liquidity than he should have, because Uniswap subtracts uniswapMinimumLiquidity from his liquidity (see MINIMUM_LIQUIDITY in UniswapV2Pair.sol)
    const totalShare = sum([toSamShare(100), toSallyShare(100)])
    expect(totalShare).to.be.within(70, 100)

    await router.connect(bella).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseAmountIn, 0, [baseAddress, quoteAddress], bella.address, MaxUint256)
    const [basePoolAmountAfter, quotePoolAmountAfter] = getLiquidityAfterSell(basePoolAmountBefore, quotePoolAmountBefore, baseAmountIn)
    const [reserve0After, reserve1After] = await pair.getReserves()
    expect(reserve0After).to.equal(basePoolAmountAfter)
    expect(reserve1After).to.equal(quotePoolAmountAfter)

    const basePoolDiff = basePoolAmountBefore - basePoolAmountAfter
    const quotePoolDiff = quotePoolAmountBefore - quotePoolAmountAfter

    await coliquidityAsSam.withdrawPosition(0, positionSamBefore.liquidityAmount, 0, 0, MaxUint256)
    const positionSamAfter = await coliquidity.positions(0)
    expect(Object.create(positionSamAfter)).to.deep.include({
      offerIndex: $zero,
      maker: bob.address,
      taker: sam.address,
      makerToken: base.address,
      takerToken: quote.address,
      liquidityAmount: $zero,
      makerAmount: max($zero, positionSamBefore.makerAmount.sub(toSamShare(basePoolAmountAfter))),
      takerAmount: max($zero, positionSamBefore.takerAmount.sub(toSamShare(quotePoolAmountAfter))),
      lockedUntil: $zero,
    })

    await coliquidityAsSally.withdrawPosition(1, positionSallyBefore.liquidityAmount, 0, 0, MaxUint256)
    const positionSallyAfter = await coliquidity.positions(1)
    expect(Object.create(positionSallyAfter)).to.deep.include({
      offerIndex: $zero,
      maker: bob.address,
      taker: sally.address,
      makerToken: base.address,
      takerToken: quote.address,
      liquidityAmount: $zero,
      makerAmount: max($zero, positionSallyBefore.makerAmount.sub(toSallyShare(basePoolAmountAfter))),
      takerAmount: max($zero, positionSallyBefore.takerAmount.sub(toSallyShare(quotePoolAmountAfter))),

      // makerAmount: $zero,
      // takerAmount: BigNumber.from(quotePoolDiff * sallyShare),
      lockedUntil: $zero,
    })

    const offerBobAfter = await coliquidity.offers(0)
    const offerBobTakerTokensAfter = await coliquidity.offersTakerTokens(0)
    expect(Object.create(offerBobAfter)).to.deep.include({
      makerToken: base.address,
      maker: bob.address,
      makerAmount: BigNumber.from(
        makerAmount
        - makerAmountDesired
        - 4 * makerAmountDesired
        + subtractFee(toSamShare(basePoolAmountAfter), makerAmountDesired, feeNumerator, feeDenominator).toNumber()
        + subtractFee(toSallyShare(basePoolAmountAfter), 4 * makerAmountDesired, feeNumerator, feeDenominator).toNumber(),
      ),
      taker: zero,
      reinvest: true,
      lockedUntil: $zero,
    })
    expect(offerBobTakerTokensAfter).to.have.members([quoteAddress])
    // NOTE: Bob must withdraw offer after Sam and Sally withdraw positions because he set reinvest = true, so base amounts will accumulate on the offer

    await coliquidityAsBob.withdrawOffer(0)

    // NOTE: It looks like BigNumber truncates differently in Solidity vs in JavaScript
    const baseAdjustment = 1
    const quoteAdjustment = 1

    await expectBalances([
        [bob, base, initialBaseAmount - makerAmount + offerBobAfter.makerAmount.toNumber()],
        [bob, quote, initialQuoteAmount],
        [sam, base, initialBaseAmount],
        [sam, quote, initialQuoteAmount - takerAmountDesired + toSamShare(quotePoolAmountAfter).toNumber()],
        [sally, base, initialBaseAmount],
        [sally, quote, initialQuoteAmount - 4 * takerAmountDesired + toSallyShare(quotePoolAmountAfter).toNumber()],
        [bella, base, initialBaseAmount + basePoolDiff],
        [bella, quote, initialQuoteAmount + quotePoolDiff],
        [owen, base, initialBaseAmount
        + getFee(toSamShare(basePoolAmountAfter), makerAmountDesired, feeNumerator, feeDenominator).toNumber()
        + getFee(toSallyShare(basePoolAmountAfter), 4 * makerAmountDesired, feeNumerator, feeDenominator).toNumber(),
        ],
        [owen, quote, initialQuoteAmount],
        [coliquidity, base, 0],
        [coliquidity, quote, 0],
        [pair, base, toPairShare(makerAmountDesired + 4 * makerAmountDesired - basePoolDiff).toNumber() + baseAdjustment],
        [pair, quote, toPairShare(takerAmountDesired + 4 * takerAmountDesired - quotePoolDiff).toNumber() + quoteAdjustment],
      ],
    )
  })

  it("must not allow to withdraw position twice", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    const positionSamBefore = await coliquidity.positions(0)
    await coliquidityAsSam.withdrawPosition(0, positionSamBefore.liquidityAmount, 0, 0, MaxUint256)
    await expect(coliquidityAsSam.withdrawPosition(0, positionSamBefore.liquidityAmount, 0, 0, MaxUint256)).to.be.revertedWith("Coliquidity: WPLGL")
  })

  it("must not allow to withdraw offer twice", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsBob.withdrawOffer(0)
    await expect(coliquidityAsBob.withdrawOffer(0)).to.be.revertedWith("Coliquidity: WOMAZ")
  })

  it("must allow to provide liquidity into existing pool", async () => {
    /*
     * Covered by "must allow to withdraw position with fees":
     * - Sam's createPosition call deposits into a new pool
     * - Sally's createPosition call deposits into an existing pool
     */
  })

  it("must allow to withdraw position if sender is maker or taker", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 2 * makerAmountDesired, 2 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)

    // withdraw as maker
    await coliquidityAsSam.withdrawPosition(0, 100, 0, 0, MaxUint256)
    // withdraw as taker
    await coliquidityAsSally.withdrawPosition(1, 100, 0, 0, MaxUint256)
  })

  it("must not allow to withdraw position if sender is not maker or taker", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await expect(coliquidityAsSally.withdrawPosition(0, 1, 1, 1, MaxUint256)).to.be.revertedWith("WPMTS")
  })

  it("must not allow to withdraw position if lockedUntil is not reached", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, MaxUint256)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await expect(coliquidityAsSam.withdrawPosition(0, 1, 1, 1, MaxUint256)).to.be.revertedWith("Coliquidity: WPLLT")
  })

  it("must not allow to withdraw offer if lockedUntil is not reached", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, MaxUint256)
    await expect(coliquidityAsBob.withdrawOffer(0)).to.be.revertedWith("Coliquidity: WOLLT")
  })

  it("must not transfer the tokens to maker if reinvest = true", async () => {
    const reinvest = true
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], reinvest, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 4 * makerAmountDesired, 4 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)

    const positionSamBefore = await coliquidity.positions(0)
    const positionSallyBefore = await coliquidity.positions(1)

    await coliquidityAsSam.withdrawPosition(0, positionSamBefore.liquidityAmount, 0, 0, MaxUint256)
    await coliquidityAsSally.withdrawPosition(1, positionSallyBefore.liquidityAmount, 0, 0, MaxUint256)

    await expectBalances([
      [bob, base, initialBaseAmount - makerAmount],
      [bob, quote, initialQuoteAmount],
    ])
  })

  it("must transfer the tokens to maker if reinvest = false", async () => {
    const reinvest = false
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], reinvest, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 4 * makerAmountDesired, 4 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)

    const positionSamBefore = await coliquidity.positions(0)
    const positionSallyBefore = await coliquidity.positions(1)

    const liquidityTotalSupply = await pair.totalSupply()
    const toSamShare = (value: BigNumberish) => BigNumber.from(value).mul(positionSamBefore.liquidityAmount).div(liquidityTotalSupply)
    const toSallyShare = (value: BigNumberish) => BigNumber.from(value).mul(positionSallyBefore.liquidityAmount).div(liquidityTotalSupply)

    await coliquidityAsSam.withdrawPosition(0, positionSamBefore.liquidityAmount, 0, 0, MaxUint256)
    await coliquidityAsSally.withdrawPosition(1, positionSallyBefore.liquidityAmount, 0, 0, MaxUint256)

    const basePoolAmountAfter = makerAmountDesired + 4 * makerAmountDesired

    await expectBalances([
      [bob, base, initialBaseAmount - makerAmount + toSamShare(basePoolAmountAfter).toNumber() + toSallyShare(basePoolAmountAfter).toNumber()],
      [bob, quote, initialQuoteAmount],
    ])
  })

  it("must return offersTakerTokens", async () => {
    const expectedTakerTokens = [quoteAddress]
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, expectedTakerTokens, true, 0)
    const actualTakerTokens = await coliquidityAsSam.offersTakerTokens(0)
    expect(actualTakerTokens).to.deep.equal(expectedTakerTokens)
  })

  it("must return offersByMaker", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    const offers = await coliquidity.offersByMaker(bob.address, 1)
    expect(offers).to.deep.equal([
      [
        BigNumber.from(0),
        [
          bob.address,
          baseAddress,
          BigNumber.from(makerAmount),
          zero,
          [quoteAddress],
          true,
          $zero,
        ],
      ],
    ])
  })

  it("must return positionsByMaker & positionsByTaker", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    const positionSam = await coliquidity.positions(0)
    const positionsByMaker = await coliquidity.positionsByMaker(bob.address, 1)
    expect(positionsByMaker).to.deep.equal([
      [
        BigNumber.from(0),
        [
          $zero,
          bob.address,
          sam.address,
          baseAddress,
          quoteAddress,
          BigNumber.from(makerAmountDesired),
          BigNumber.from(takerAmountDesired),
          positionSam.liquidityAmount,
          $zero,
        ],
      ],
    ])
    const positionsByTaker = await coliquidity.positionsByTaker(sam.address, 1)
    expect(positionsByTaker).to.deep.equal([
      [
        BigNumber.from(0),
        [
          $zero,
          bob.address,
          sam.address,
          baseAddress,
          quoteAddress,
          BigNumber.from(makerAmountDesired),
          BigNumber.from(takerAmountDesired),
          positionSam.liquidityAmount,
          $zero,
        ],
      ],
    ])
  })

  // it.only("must return a lot of offersByMaker", async () => {
  //   const length = 1000
  //   await Promise.all(range(0, length).map(i => {
  //     coliquidityAsBob.createOffer(baseAddress, 1, zero, [quoteAddress], true, 0)
  //   }))
  //   const offers = await coliquidity.offersByMaker(bob.address)
  //   expect(offers).to.have.length(length)
  // })

  it("must allow the owner to set fee", async () => {
    await coliquidityAsOwen.setFee(5, 100)
  })

  it("must not allow the owner to set fee to zero", async () => {
    await expect(coliquidityAsOwen.setFee(0, 1)).to.be.revertedWith("Coliquidity: SFNZ")
    await expect(coliquidityAsOwen.setFee(1, 0)).to.be.revertedWith("Coliquidity: SFDZ")
  })

  it("must not allow non-owner to set fee", async () => {
    await expect(coliquidityAsBob.setFee(1, 100)).to.be.revertedWith("not the owner")
  })

  it("must calculate the fee correctly", async () => {
    expect(getFee(10000, 10000, 1, 100)).to.equal(0)
    expect(getFee(5000, 10000, 1, 100)).to.equal(0)
    expect(getFee(20000, 10000, 1, 100)).to.equal(100)
    expect(subtractFee(10000, 10000, 1, 100)).to.equal(10000)
    expect(subtractFee(5000, 10000, 1, 100)).to.equal(5000)
    expect(subtractFee(20000, 10000, 1, 100)).to.equal(20000 - (20000 - 10000) * 1 / 100)
  })

  xit("must launch Marnotaur token", async () => {
    const expirationDateMin = now
    const expirationDateMax = dateAdd(now, { years: 5 })
    const expirationDateMinPre = dateAdd(expirationDateMin, { seconds: -1 })
    const expirationDateMaxPost = dateAdd(expirationDateMax, { seconds: +1 })
    const metronome = new TestMetronome(now)
    await assert(
      asyncProperty(commands(getMarnotaurCommandArbitraries(), { maxCommands: 50 }), context(), async (cmds, ctx) => {
        ctx.log("Running cmds")
        const snapshot = await ethers.provider.send("evm_snapshot", [])
        try {
          await asyncModelRun(getMarnotaurSetup, cmds)
        } finally {
          await ethers.provider.send("evm_revert", [snapshot])
        }
      }),
    )
  })

  function getMarnotaurSetup(): { model: ColiquidityBlockchainModel, real: ColiquidityBlockchainReal } {
    return {
      model: { tokens: [] },
      real: { tokens: [] },
    }
  }

  function getMarnotaurCommandArbitraries() {
    return [
      record({
        maker: constantFrom(bob.address),
        makerToken: constantFrom(base.address),
        makerAmount: amount(initialBaseAmount),
        taker: constantFrom(zero, sam.address, sally.address),
        takerToken: constantFrom(quote.address),
        reinvest: boolean(),
        lockedUntil: oneof({}, constantFrom(0), nat()),
      }).map((r) => new CreateOfferCommand(
        r.maker,
        r.makerToken,
        r.makerAmount,
        r.taker,
        [r.takerToken],
        r.reinvest,
        r.lockedUntil,
      )),

      // constant(new SellCommand()),
      // constant(new UseCommand()),
      // constant(new CancelCommand()),
      // constant(new WithdrawCommand()),
    ]
  }

})
