import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BaseToken, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from "../../../typechain"
import { BigNumber, Contract } from "ethers"
import { Ethers } from "../../../util/types"
import { MaxUint256, scale } from "../all.helpers"
import { upgrades } from "hardhat"
import { getLatestBlockTimestamp, zero } from "../test.helpers"
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory } from "../Uniswap.helpers"
import { flatten } from "lodash"
import { nail } from "../../../util/string"

export class TradingSimulation {
  constructor(
    public owner: SignerWithAddress,
    public stranger: SignerWithAddress,
    public alice: SignerWithAddress,
    public bob: SignerWithAddress,
    public sam: SignerWithAddress,
    public base: BaseToken,
    public quote: QuoteToken,
    public weth: WETH9,
    public factory: UniswapV2Factory,
    public router: UniswapV2Router02,
    public pair: UniswapV2Pair,
    public baseTotalAmount: BigNumber,
    public quoteTotalAmount: BigNumber,
    public baseInitialAmount: BigNumber,
    public quoteInitialAmount: BigNumber,
    public liquidityRatio: BigNumber,
    public depositRatio: BigNumber,
    public pumpRatio: BigNumber,
    public now: Date,
    public ethers: Ethers,
  ) { }

  static async create(
    $baseTotalAmount: BigNumber,
    $quoteTotalAmount: BigNumber,
    $baseInitialAmount: BigNumber,
    $quoteInitialAmount: BigNumber,
    liquidityRatio: BigNumber,
    depositRatio: BigNumber,
    pumpRatio: BigNumber,
    ethers: Ethers,
  ) {
    const signers = await ethers.getSigners()
    const [owner, stranger, alice, bob, sam] = signers

    const baseTotalAmount = $baseTotalAmount.mul(scale)
    const quoteTotalAmount = $quoteTotalAmount.mul(scale)
    const baseInitialAmount = $baseInitialAmount.mul(scale)
    const quoteInitialAmount = $quoteInitialAmount.mul(scale)

    const baseRecipients = signers.map((s) => s.address)
    const baseAmounts = signers.map(() => baseInitialAmount)
    const quoteRecipients = signers.map((s) => s.address)
    const quoteAmounts = signers.map(() => quoteInitialAmount)
    // baseTokenModel = { balanceByAddress: fromPairs(zip(baseRecipients, baseAmounts)) }
    // quoteTokenModel = { balanceByAddress: fromPairs(zip(quoteRecipients, quoteAmounts)) }

    const baseTokenFactory = await ethers.getContractFactory("BaseToken")
    const base = (await upgrades.deployProxy(baseTokenFactory, [baseTotalAmount, baseRecipients, baseAmounts])).connect(zero) as unknown as BaseToken
    await base.deployed()

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    const quote = (await upgrades.deployProxy(quoteTokenFactory, [quoteTotalAmount, quoteRecipients, quoteAmounts])).connect(zero) as unknown as QuoteToken
    await quote.deployed()

    const wethContractFactory = await getWETH9ContractFactory(ethers)
    const weth = await wethContractFactory.deploy() as WETH9

    const UniswapV2FactoryContractFactory = await getUniswapV2FactoryContractFactory(ethers)
    const factory = await UniswapV2FactoryContractFactory.deploy(owner.address) as UniswapV2Factory

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    const router = await UniswapV2Router02ContractFactory.deploy(factory.address, weth.address) as UniswapV2Router02

    const pair = await deployUniswapPair(factory, base as Contract, quote as Contract, ethers) as UniswapV2Pair

    const approvals = flatten([owner, stranger, alice, bob, sam].map((signer) => [
      base.connect(signer).approve(router.address, MaxUint256),
      quote.connect(signer).approve(router.address, MaxUint256),
    ]))
    await Promise.all(approvals)

    const now = new Date(await getLatestBlockTimestamp() * 1000)

    return new this(
      owner,
      stranger,
      alice,
      bob,
      sam,
      base,
      quote,
      weth,
      factory,
      router,
      pair,
      baseTotalAmount,
      quoteTotalAmount,
      baseInitialAmount,
      quoteInitialAmount,
      liquidityRatio,
      depositRatio,
      pumpRatio,
      now,
      ethers,
    )
  }

  async run() {

  }

  async addLiquidityFromSam() {
    const baseLiquidity = this.baseInitialAmount.div(this.liquidityRatio)
    const quoteLiquidity = this.quoteInitialAmount.div(this.liquidityRatio)
    const priceInverse = baseLiquidity.div(quoteLiquidity)
    // console.log('baseLiquidity', this.baseLiquidity.toString())
    // console.log('quoteLiquidity', quoteLiquidity.toString())
    await this.router.connect(this.sam).addLiquidity(this.base.address, this.quote.address, baseLiquidity, quoteLiquidity, baseLiquidity, quoteLiquidity, this.sam.address, MaxUint256)
  }

  async tradeFromBobInCycle() {
    const reservesBefore = await this.pair.getReserves()
    console.log("reserves before", { _reserve0: reservesBefore._reserve0.toString(), _reserve1: reservesBefore._reserve1.toString() })
    for (let i = 0; i < 700; i++) {
      // console.log(`trade from bob ${i}`)
      const quoteTradeAmount = await this.quote.balanceOf(this.bob.address)
      const baseTradeAmount = await this.base.balanceOf(this.bob.address)
      // const this.baseBalanceBefore = await this.base.balanceOf(bob.address)
      await this.router.connect(this.bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteTradeAmount, 0, [this.quote.address, this.base.address], this.bob.address, MaxUint256)
      // const this.baseBalanceAfter = await this.base.balanceOf(bob.address)
      // const this.baseTradeAmount = this.baseBalanceAfter.sub(baseBalanceBefore)
      await this.router.connect(this.bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseTradeAmount, 0, [this.base.address, this.quote.address], this.bob.address, MaxUint256)
    }
    const reservesAfter = await this.pair.getReserves()
    console.log("reserves after", { _reserve0: reservesAfter._reserve0.toString(), _reserve1: reservesAfter._reserve1.toString() })
  }

  async buyFromBob() {
    const quoteIn = await this.quote.balanceOf(this.bob.address)
    // const this.basePumpOut = toAmountAfterFee(quotePumpIn).mul(priceInverse)
    // expect(quotePumpIn.lt(quoteLiquidity))
    // expect(basePumpOut.lt(baseLiquidity))
    // expect(basePumpOut.gt(quotePumpIn))
    // console.log('quotePumpIn.toString()', quotePumpIn.toString())
    // console.log('basePumpOut.toString()', this.basePumpOut.toString())
    await this.router.connect(this.bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteIn, 0, [this.quote.address, this.base.address], this.bob.address, MaxUint256)
    // expect(await this.base.balanceOf(bob.address)).to.be.gt(baseInitialAmount)
    // expect(await quote.balanceOf(bob.address)).to.be.lt(quoteInitialAmount)
  }

  async sellFromBob() {
    const baseIn = this.baseInitialAmount.div(this.pumpRatio)
    await this.router.connect(this.bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseIn, 0, [this.base.address, this.quote.address], this.bob.address, MaxUint256)
  }

  async calculateProfitFromAlice(activity: string) {
    console.log("calculateProfit from alice")
    const quoteFinalAmount = await this.quote.balanceOf(this.alice.address)
    const profit = quoteFinalAmount.sub(this.quoteInitialAmount)
    console.info(nail(`
      * Alice balance before ${activity}: ${this.quoteInitialAmount.div(scale)} ETH
      * Alice balance after ${activity}: ${quoteFinalAmount.div(scale)} ETH
      * Alice profit: ${profit.div(scale)} ETH (+${profit.mul(100).div(this.quoteInitialAmount)}%)
    `))
  }

  async logBalances() {
    const padding = 20
    console.dir({
      base: {
        "sam    ": (await this.base.balanceOf(this.sam.address)).toString().padStart(padding),
        "alice   ": (await this.base.balanceOf(this.alice.address)).toString().padStart(padding),
        "bob    ": (await this.base.balanceOf(this.bob.address)).toString().padStart(padding),
      },
      quote: {
        "sam    ": (await this.quote.balanceOf(this.sam.address)).toString().padStart(padding),
        "alice   ": (await this.quote.balanceOf(this.alice.address)).toString().padStart(padding),
        "bob    ": (await this.quote.balanceOf(this.bob.address)).toString().padStart(padding),
      },
    }, { compact: false })
  }
}
