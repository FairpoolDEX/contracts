import { DateTime } from "luxon"
import { expect } from "../../util/expect"
import { toInteger, identity, flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, hours, MaxUint256, seconds, sum, toTokenAmount, years } from "../support/all.helpers"
import { zero, getLatestBlockTimestamp, setNextBlockTimestamp, timeTravel, getSnapshot, revertToSnapshot, expectBalances, expectBalance, $zero, logBn } from "../support/test.helpers"
import { Coliquidity, BaseToken, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from "../../typechain"
import { BigNumber, BigNumberish, Contract } from "ethers"
import { beforeEach } from "mocha"
import { Address } from "../../util/types"
import { deployUniswapPair, getMinimumLiquidityShare, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory, uniswapMinimumLiquidity } from "../support/Uniswap.helpers"
import { getLiquidityAfterSell } from "../support/Coliquidity.helpers"
import $debug, { Debugger } from "debug"

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

  it.only("must allow to withdraw position with fees", async () => {
    await coliquidityAsBob.createOffer(baseAddress, makerAmount, zero, [quoteAddress], true, 0)
    await coliquidityAsSam.createPosition(offerIndex, quoteAddress, makerAmountDesired, takerAmountDesired, makerAmountDesired * 0.99, takerAmountDesired * 0.99, MaxUint256)
    await coliquidityAsSally.createPosition(offerIndex, quoteAddress, 4 * makerAmountDesired, 4 * takerAmountDesired, 2 * makerAmountDesired * 0.99, 2 * takerAmountDesired * 0.99, MaxUint256)

    const samShare = 1 / (1 + 4)
    const sallyShare = 4 / (1 + 4)

    const positionSamBefore = await coliquidity.positions(0)
    const positionSallyBefore = await coliquidity.positions(1)
    const liquidityTotalSupply = await pair.totalSupply()
    logBn("positionSamBefore", positionSamBefore)
    logBn("positionSallyBefore", positionSallyBefore)
    expect(liquidityTotalSupply).to.equal(sum([positionSamBefore.liquidityAmount, positionSallyBefore.liquidityAmount]).add(uniswapMinimumLiquidity))
    const token0 = await pair.token0()
    const token1 = await pair.token1()
    expect(token0).to.equal(baseAddress)

    expect(token1).to.equal(quoteAddress)
    const [basePoolAmountBefore, quotePoolAmountBefore] = [makerAmountDesired + 4 * makerAmountDesired, takerAmountDesired + 4 * takerAmountDesired]
    const [reserve0Before, reserve1Before] = await pair.getReserves()
    expect(reserve0Before).to.equal(basePoolAmountBefore)

    expect(reserve1Before).to.equal(quotePoolAmountBefore)

    await router.connect(bella).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseAmountIn, 0, [baseAddress, quoteAddress], sally.address, MaxUint256)
    const [basePoolAmountAfter, quotePoolAmountAfter] = getLiquidityAfterSell(basePoolAmountBefore, quotePoolAmountBefore, baseAmountIn)
    const [reserve0After, reserve1After] = await pair.getReserves()
    expect(reserve0After).to.equal(basePoolAmountAfter)
    expect(reserve1After).to.equal(quotePoolAmountAfter)
    console.log("reserve0After, reserve1After", reserve0After.toString(), reserve1After.toString())

    const basePoolDiff = basePoolAmountBefore - basePoolAmountAfter
    const quotePoolDiff = quotePoolAmountBefore - quotePoolAmountAfter

    await coliquidityAsSally.withdrawPosition(1, positionSallyBefore.liquidityAmount, 0, 0, MaxUint256)
    const positionSallyAfter = await coliquidity.positions(1)
    logBn("positionSallyAfter", positionSallyAfter)
    expect(Object.create(positionSallyAfter)).to.deep.include({
      offerIndex: $zero,
      maker: bob.address,
      taker: sally.address,
      makerToken: base.address,
      takerToken: quote.address,
      liquidityAmount: $zero,
      makerAmount: $zero,
      takerAmount: BigNumber.from(quotePoolDiff * sallyShare),
      lockedUntil: $zero,
    })

    await coliquidityAsSam.withdrawPosition(0, positionSamBefore.liquidityAmount, 0, 0, MaxUint256)
    const positionSamAfter = await coliquidity.positions(0)
    logBn("positionSamAfter", positionSamAfter)

    console.log('quotePoolDiff', quotePoolDiff)
    console.log('quotePoolDiff * samShare', quotePoolDiff * samShare)


    expect(Object.create(positionSamAfter)).to.deep.include({
      offerIndex: $zero,
      maker: bob.address,
      taker: sam.address,
      makerToken: base.address,
      takerToken: quote.address,
      liquidityAmount: $zero,
      makerAmount: positionSamBefore.makerAmount.sub(getMinimumLiquidityShare(positionSamBefore.makerAmount.add(-basePoolDiff * samShare), positionSamBefore.liquidityAmount)),
      takerAmount: positionSamBefore.takerAmount.sub(getMinimumLiquidityShare(positionSamBefore.takerAmount.add(-quotePoolDiff * samShare), positionSamBefore.liquidityAmount)),
      lockedUntil: $zero,
    })
    const offerBobAfter = await coliquidity.offers(0)

    expect(Object.create(offerBobAfter)).to.deep.include({
      makerToken: base.address,
      maker: bob.address,
      makerAmount: BigNumber.from(makerAmount - makerAmountDesired - 4 * makerAmountDesired + getMinimumLiquidityShare(positionSamBefore.makerAmount.add(-basePoolDiff * samShare), positionSamBefore.liquidityAmount).toNumber() + positionSallyBefore.makerAmount.add(-basePoolDiff * sallyShare).toNumber()),
      taker: zero,
      takerTokens: [quote.address],
      reinvest: true,
      lockedUntil: 0,
    })
    // NOTE: Bob must withdraw offer after Sam and Sally withdraw positions because he set reinvest = true, so base amounts will accumulate on the offer

    await coliquidityAsBob.withdrawOffer(0)

    await expectBalances([
        [bob, base, initialBaseAmount - makerAmount + makerAmount + baseAmountIn],
        [bob, quote, initialQuoteAmount],
        [sam, base, initialBaseAmount],
        [sam, quote, initialQuoteAmount - takerAmountDesired + quotePoolAmountAfter * samShare],
        [sally, base, initialBaseAmount],
        [sally, quote, initialQuoteAmount - 4 * takerAmountDesired + quotePoolAmountAfter * sallyShare],
        [owen, base, initialBaseAmount],
        [owen, quote, initialQuoteAmount],
        [bella, base, initialBaseAmount - baseAmountIn],
        [bella, quote, initialQuoteAmount + (quotePoolAmountBefore - quotePoolAmountAfter)],
        [coliquidity, base, 0],
        [coliquidity, quote, 0],
        [pair, base, 0],
        [pair, quote, 0],
      ],
    )
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
    await expect(coliquidityAsSam.withdrawPosition(0, 1, 1, 1, MaxUint256)).to.be.revertedWith("WPLLT")
  })

  it("must transfer the tokens to maker if reinvest = false", async () => {

  })

  it("must allow to withdraw offer with fees", async () => {

  })

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

})
