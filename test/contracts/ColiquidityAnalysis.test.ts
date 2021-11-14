import { Context } from "mocha"
import { getLiquidityAfterBuy, getLiquidityAfterDeposit, getLiquidityAfterSell, getLiquidityPoolShare, getWethVolumeForStablePrice} from "../support/Coliquidity.generic.helpers"
import { expect } from "../../util/expect"
import { uniswapFeeNumber } from "../support/Uniswap.helpers"

describe("ColiquidityAnalysis", async function() {

  it(`must compare coliquidity profit with long profit`, async function(this: Context) {
    // expect(getColiquidityProfit(HighVolumePump)).to.be.greaterThan(getLongProfit(HighVolumePump))
    // expect(getColiquidityProfit(LowVolumePump)).to.be.lessThan(getLongProfit(LowVolumePump))
  })

  it(`must compare coliquidity profit with regular liquidity provisioning profit`, async function(this: Context) {

  })

  it('must check getLiquidityPoolShare', function() {
    expect(getLiquidityPoolShare(80, 100000, 2, 2500)).to.equal(0.025)
    expect(getLiquidityPoolShare(34, 52, 0.5, 0.764705882)).to.equal(0.014705882352941176)
    expect(() => getLiquidityPoolShare(80, 100000, 10, 2500)).to.throw()
  })
})

export type Scenario = {
  // WETH-USDT pair: https://v2.info.uniswap.org/pair/0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852
  fee: number
  wethLiquidity: number
  usdtLiquidity: number
  wethVolume: number
  usdtVolume: number
  wethPortfolio: number
  usdtPortfolio: number
  priceIsStable: boolean
}

export const Default: Scenario = {
  fee: uniswapFeeNumber,
  wethLiquidity: 25000,
  usdtLiquidity: 100000000,
  wethVolume: 0,
  usdtVolume: 0,
  wethPortfolio: 0,
  usdtPortfolio: 1000000,
  priceIsStable: true,
}

export const HighVolumeRange: Scenario = Object.assign({}, Default, {
  wethVolume: getWethVolumeForStablePrice(Default.wethLiquidity, Default.usdtLiquidity, 500 * Default.usdtLiquidity, Default.fee),
  usdtVolume: 500 * Default.usdtLiquidity,
  priceIsStable: true,
})

export const HighVolumePump: Scenario = Object.assign({}, Default, {
  wethVolume: 0,
  usdtVolume: 500 * Default.usdtLiquidity,
  priceIsStable: false,
})

export const LowVolumePump: Scenario = Object.assign({}, Default, {
  wethVolume: 0,
  usdtVolume: 5 * Default.usdtLiquidity,
  priceIsStable: false,
})

export async function getColiquidityProfit(scenario: Scenario) {
  const [wethLiquidityAfterStart, usdtLiquidityAfterStart] = [scenario.wethLiquidity, scenario.usdtLiquidity]
  const [wethLiquidityAfterDeposit, usdtLiquidityAfterDeposit] = getLiquidityAfterDeposit(wethLiquidityAfterStart, usdtLiquidityAfterStart, scenario.wethLiquidity, scenario.usdtLiquidity)
  const [priceAfterStart, priceAfterDeposit] = [usdtLiquidityAfterStart / wethLiquidityAfterStart, usdtLiquidityAfterDeposit / wethLiquidityAfterDeposit]
  expect(priceAfterStart).to.equal(priceAfterDeposit)
  const [wethLiquidityAfterBuy, usdtLiquidityAfterBuy] = getLiquidityAfterBuy(wethLiquidityAfterStart, usdtLiquidityAfterStart, scenario.usdtVolume, scenario.fee)
  const [wethLiquidityAfterSell, usdtLiquidityAfterSell] = getLiquidityAfterSell(wethLiquidityAfterBuy, usdtLiquidityAfterBuy, scenario.wethVolume, scenario.fee)
  if (scenario.priceIsStable) {
    const [priceAfterStart, priceAfterSell] = [usdtLiquidityAfterStart / wethLiquidityAfterStart, usdtLiquidityAfterSell / wethLiquidityAfterSell]
    expect(priceAfterStart).to.equal(priceAfterSell)
  }
  // return usdtFees *
}

export async function getLongProfit(scenario: Scenario) {

}
