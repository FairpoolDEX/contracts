import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BaseToken, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from '../../../typechain-types'
import { BigNumber, Contract } from 'ethers'
import { Ethers } from '../../../util/types'
import { MaxUint256, scale } from '../all.helpers'
import { upgrades } from 'hardhat'
import { getLatestBlockTimestamp } from '../test.helpers'
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory } from '../Uniswap.helpers'
import { flatten } from 'lodash'
import { nail } from '../../../util/string'
import { expect } from '../../../util/expect'
import { Debugger } from 'debug'
import { $zero } from '../../../data/allAddresses'

export class TradingSimulation {
  constructor(
    public owner: SignerWithAddress,
    public stranger: SignerWithAddress,
    public alice: SignerWithAddress,
    public bob: SignerWithAddress,
    public sam: SignerWithAddress,
    public zed: SignerWithAddress,
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
    public debug: Debugger,
    public ethers: Ethers,
  ) { }

  public feeNumerator = BigNumber.from(997)
  public feeDenominator = BigNumber.from(1000)

  static async create(
    $baseTotalAmount: BigNumber,
    $quoteTotalAmount: BigNumber,
    $baseInitialAmount: BigNumber,
    $quoteInitialAmount: BigNumber,
    liquidityRatio: BigNumber,
    depositRatio: BigNumber,
    pumpRatio: BigNumber,
    debug: Debugger,
    ethers: Ethers,
  ) {
    const signers = await ethers.getSigners()
    const [owner, stranger, alice, bob, sam, zed] = signers

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

    const baseTokenFactory = await ethers.getContractFactory('BaseToken')
    const base = (await upgrades.deployProxy(baseTokenFactory, [baseTotalAmount, baseRecipients, baseAmounts])).connect($zero) as unknown as BaseToken
    await base.deployed()

    const quoteTokenFactory = await ethers.getContractFactory('QuoteToken')
    const quote = (await upgrades.deployProxy(quoteTokenFactory, [quoteTotalAmount, quoteRecipients, quoteAmounts])).connect($zero) as unknown as QuoteToken
    await quote.deployed()

    const wethContractFactory = await getWETH9ContractFactory(ethers)
    const weth = await wethContractFactory.deploy() as WETH9

    const UniswapV2FactoryContractFactory = await getUniswapV2FactoryContractFactory(ethers)
    const factory = await UniswapV2FactoryContractFactory.deploy(owner.address) as UniswapV2Factory

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    const router = await UniswapV2Router02ContractFactory.deploy(factory.address, weth.address) as UniswapV2Router02

    const pair = await deployUniswapPair(factory, base as Contract, quote as Contract, ethers) as UniswapV2Pair

    const approvals = flatten(signers.map((signer) => [
      base.connect(signer).approve(router.address, MaxUint256),
      quote.connect(signer).approve(router.address, MaxUint256),
    ]))
    await Promise.all(approvals)

    const now = new Date(await getLatestBlockTimestamp(ethers) * 1000)

    return new this(
      owner,
      stranger,
      alice,
      bob,
      sam,
      zed,
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
      debug,
      ethers,
    )
  }

  async run() {

  }

  async addLiquidityFromSam() {
    const baseLiquidity = this.baseInitialAmount.div(this.liquidityRatio)
    const quoteLiquidity = this.quoteInitialAmount.div(this.liquidityRatio)
    const priceInverse = baseLiquidity.div(quoteLiquidity)
    // this.debug('baseLiquidity', this.baseLiquidity.toString())
    // this.debug('quoteLiquidity', quoteLiquidity.toString())
    await this.router.connect(this.sam).addLiquidity(this.base.address, this.quote.address, baseLiquidity, quoteLiquidity, baseLiquidity, quoteLiquidity, this.sam.address, MaxUint256)
  }

  async tradeFromBobInCycle() {
    /**
     * baseReserveBefore / quoteReserveBefore = baseReserveAfter / quoteReserveAfter
     *
     * baseBalanceInterim = baseBalanceBefore - baseAmountInterim
     * quoteBalanceInterim = quoteBalanceBefore + quoteAmountInterim * (1 - 0.003)
     * baseReserveInterim = baseReserveBefore + baseAmountInterim
     * quoteReserveInterim = quoteReserveBefore - quoteAmountInterim * (1 - 0.003)
     * baseReserveInterim * quoteReserveInterim = baseReserveBefore * quoteReserveBefore
     *
     * baseBalanceAfter = baseBalanceInterim + baseAmountAfter * (1 - 0.003)
     * quoteBalanceAfter = quoteBalanceInterim - quoteAmountAfter
     * baseReserveAfter = baseReserveInterim - baseAmountAfter * (1 - 0.003)
     * quoteReserveAfter = quoteReserveInterim + quoteAmountAfter
     * baseReserveAfter * quoteReserveAfter = baseReserveInterim * quoteReserveInterim
     *
     * quoteAmountAfter = quoteReserveAfter - quoteBalanceInterim
     */
    const { _reserve0: baseReserveBefore, _reserve1: quoteReserveBefore } = await this.pair.getReserves()
    this.debug('reserves before', baseReserveBefore.toString(), quoteReserveBefore.toString())
    const ratioBefore = baseReserveBefore.div(quoteReserveBefore)
    for (let i = 0; i < 500; i++) {
      // this.debug(`trade from bob ${i}`)
      const baseBalanceBefore = await this.base.balanceOf(this.bob.address)
      const quoteBalanceBefore = await this.quote.balanceOf(this.bob.address)
      // this.debug('baseBalanceBefore', baseBalanceBefore.toString())
      // this.debug('quoteBalanceBefore', quoteBalanceBefore.toString())
      await this.router.connect(this.bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseBalanceBefore, 0, [this.base.address, this.quote.address], this.bob.address, MaxUint256)
      const quoteBalanceAfter = await this.quote.balanceOf(this.bob.address)
      const quoteBalanceDiff = quoteBalanceAfter.sub(quoteBalanceBefore)
      // this.debug('quoteBalanceDiff.toString()', quoteBalanceDiff.toString())
      const quoteTradeAmount = quoteBalanceDiff.mul(this.feeDenominator).div(this.feeNumerator)
      // this.debug('quoteTradeAmount.toString()', quoteTradeAmount.toString())
      await this.router.connect(this.bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteTradeAmount, 0, [this.quote.address, this.base.address], this.bob.address, MaxUint256)
      // const this.baseBalanceAfter =
      // const this.
    }
    const { _reserve0: baseReserveAfter, _reserve1: quoteReserveAfter } = await this.pair.getReserves()
    this.debug('reserves after', baseReserveAfter.toString(), quoteReserveAfter.toString())
    const ratioAfter = baseReserveAfter.div(quoteReserveAfter)
    this.debug('ratios', ratioBefore.toString(), ratioAfter.toString())
    expect(ratioBefore).to.eq(ratioAfter)
  }

  async buyFromZed() {
    const quoteIn = await this.quote.balanceOf(this.zed.address)
    // const this.basePumpOut = toAmountAfterFee(quotePumpIn).mul(priceInverse)
    // expect(quotePumpIn.lt(quoteLiquidity))
    // expect(basePumpOut.lt(baseLiquidity))
    // expect(basePumpOut.gt(quotePumpIn))
    // this.debug('quotePumpIn.toString()', quotePumpIn.toString())
    // this.debug('basePumpOut.toString()', this.basePumpOut.toString())
    await this.router.connect(this.zed).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteIn, 0, [this.quote.address, this.base.address], this.zed.address, MaxUint256)
    // expect(await this.base.balanceOf(bob.address)).to.be.gt(baseInitialAmount)
    // expect(await quote.balanceOf(bob.address)).to.be.lt(quoteInitialAmount)
  }

  async sellFromZed() {
    const baseIn = await this.base.balanceOf(this.zed.address)
    await this.router.connect(this.zed).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseIn, 0, [this.base.address, this.quote.address], this.zed.address, MaxUint256)
  }

  async calculateProfitFromAlice(activity: string) {
    this.debug('calculateProfit from alice')
    const quoteFinalAmount = await this.quote.balanceOf(this.alice.address)
    const profit = quoteFinalAmount.sub(this.quoteInitialAmount)
    this.debug(nail(`
      * Alice balance before ${activity}: ${this.quoteInitialAmount.div(scale)} ETH
      * Alice balance after ${activity}: ${quoteFinalAmount.div(scale)} ETH
      * Alice profit: ${profit.div(scale)} ETH (+${profit.mul(100).div(this.quoteInitialAmount)}%)
    `))
  }

  async logBalances() {
    const padding = 20
    this.debug('%O', {
      base: {
        'sam    ': (await this.base.balanceOf(this.sam.address)).toString().padStart(padding),
        'alice   ': (await this.base.balanceOf(this.alice.address)).toString().padStart(padding),
        'bob    ': (await this.base.balanceOf(this.bob.address)).toString().padStart(padding),
        'zed    ': (await this.base.balanceOf(this.zed.address)).toString().padStart(padding),
      },
      quote: {
        'sam    ': (await this.quote.balanceOf(this.sam.address)).toString().padStart(padding),
        'alice   ': (await this.quote.balanceOf(this.alice.address)).toString().padStart(padding),
        'bob    ': (await this.quote.balanceOf(this.bob.address)).toString().padStart(padding),
        'zed    ': (await this.quote.balanceOf(this.zed.address)).toString().padStart(padding),
      },
    }, { compact: false })
  }
}
