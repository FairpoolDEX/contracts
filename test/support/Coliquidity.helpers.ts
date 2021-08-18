import { BigNumber, Contract } from "ethers"
import { IERC20, UniswapV2Router02 } from "../../typechain"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { MaxUint256, scale } from "./all.helpers"
import { nail } from "../../util/string"

export async function addLiquidityFromSam(baseInitialAmount: BigNumber, liquidityRatio: BigNumber, quoteInitialAmount: BigNumber, router: UniswapV2Router02, sam: SignerWithAddress, base: IERC20, quote: IERC20) {
  const baseLiquidity = baseInitialAmount.div(liquidityRatio)
  const quoteLiquidity = quoteInitialAmount.div(liquidityRatio)
  const priceInverse = baseLiquidity.div(quoteLiquidity)
  // console.log('baseLiquidity', baseLiquidity.toString())
  // console.log('quoteLiquidity', quoteLiquidity.toString())
  await router.connect(sam).addLiquidity(base.address, quote.address, baseLiquidity, quoteLiquidity, baseLiquidity, quoteLiquidity, sam.address, MaxUint256)
  return { baseLiquidity, quoteLiquidity, priceInverse }
}

export async function tradeFromBobInCycle(base: Contract, quote: Contract, router: UniswapV2Router02, bob: SignerWithAddress) {
  for (let i = 0; i < 500; i++) {
    // console.log(`trade from bob ${i}`)
    const quoteTradeAmount = await quote.balanceOf(bob.address)
    const baseBalanceBefore = await base.balanceOf(bob.address)
    await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteTradeAmount, 0, [quote.address, base.address], bob.address, MaxUint256)
    const baseBalanceAfter = await base.balanceOf(bob.address)
    const baseTradeAmount = baseBalanceAfter.sub(baseBalanceBefore)
    await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseTradeAmount, 0, [base.address, quote.address], bob.address, MaxUint256)
  }
}

export async function buyFromBob(quoteInitialAmount: BigNumber, pumpRatio: BigNumber, router: UniswapV2Router02, bob: SignerWithAddress, base: IERC20, quote: IERC20) {
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

export async function sellFromBob(baseInitialAmount: BigNumber, pumpRatio: BigNumber, router: UniswapV2Router02, bob: SignerWithAddress, base: IERC20, quote: IERC20) {
  const baseIn = baseInitialAmount.div(pumpRatio)
  await router.connect(bob).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseIn, 0, [base.address, quote.address], bob.address, MaxUint256)
}

export async function calculateProfitFromAlice(activity: string, quoteInitialAmount: BigNumber, base: IERC20, quote: IERC20, alice: SignerWithAddress) {
  console.log("calculateProfit from alice")
  const quoteFinalAmount = await quote.balanceOf(alice.address)
  const profit = quoteFinalAmount.sub(quoteInitialAmount)
  console.info(nail(`
  * Alice balance before ${activity}: ${quoteInitialAmount.div(scale)} ETH
  * Alice balance after ${activity}: ${quoteFinalAmount.div(scale)} ETH
  * Alice profit: ${profit.div(scale)} ETH (+${profit.mul(100).div(quoteInitialAmount)}%)
  `))

}

export async function logBalances(base: IERC20, quote: IERC20, alice: SignerWithAddress, bob: SignerWithAddress, sam: SignerWithAddress) {
  const padding = 20
  console.dir({
    base: {
      "sam    ": (await base.balanceOf(sam.address)).toString().padStart(padding),
      "alice   ": (await base.balanceOf(alice.address)).toString().padStart(padding),
      "bob    ": (await base.balanceOf(bob.address)).toString().padStart(padding),
    },
    quote: {
      "sam    ": (await quote.balanceOf(sam.address)).toString().padStart(padding),
      "alice   ": (await quote.balanceOf(alice.address)).toString().padStart(padding),
      "bob    ": (await quote.balanceOf(bob.address)).toString().padStart(padding),
    },
  }, { compact: false })
}
