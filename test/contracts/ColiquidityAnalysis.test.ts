import { expect } from "../../util/expect"
import { Context } from "mocha"

describe("ColiquidityAnalysis", async function() {

  it(`must compare coliquidity profit with long profit`, async function(this: Context) {
    // expect(getColiquidityProfit(HighVolumePump)).to.be.greaterThan(getLongProfit(HighVolumePump))
    // expect(getColiquidityProfit(LowVolumePump)).to.be.lessThan(getLongProfit(LowVolumePump))
  })

  it(`must compare coliquidity profit with regular liquidity provisioning profit`, async function(this: Context) {

  })
})

export const fee = 0.003 // equal to 0.3%

export async function getColiquidityProfit(scenario: Scenario) {
  const [wethLiquidityAfterStart, usdtLiquidityAfterStart] = getLiquidityAfterStart(scenario)
  const [wethLiquidityAfterDeposit, usdtLiquidityAfterDeposit] = getLiquidityAfterDeposit(wethLiquidityAfterStart, usdtLiquidityAfterStart, scenario.wethLiquidity, scenario.usdtLiquidity)
  const [priceAfterStart, priceAfterDeposit] = [usdtLiquidityAfterStart / wethLiquidityAfterStart, usdtLiquidityAfterDeposit / wethLiquidityAfterDeposit]
  expect(priceAfterStart).to.equal(priceAfterDeposit)
  const [wethLiquidityAfterBuy, usdtLiquidityAfterBuy] = getLiquidityAfterBuy(wethLiquidityAfterStart, usdtLiquidityAfterStart, scenario.usdtVolume)
  const [wethLiquidityAfterSell, usdtLiquidityAfterSell] = getLiquidityAfterSell(wethLiquidityAfterBuy, usdtLiquidityAfterBuy, scenario.wethVolume)
  if (scenario.priceIsStable) {
    const [priceAfterStart, priceAfterSell] = [usdtLiquidityAfterStart / wethLiquidityAfterStart, usdtLiquidityAfterSell / wethLiquidityAfterSell]
    expect(priceAfterStart).to.equal(priceAfterSell)
  }
  // return usdtFees *
}

export async function getLongProfit(scenario: Scenario) {

}

export function getLiquidityAfterStart(scenario: Scenario) {
  return [
    scenario.wethLiquidity,
    scenario.usdtLiquidity,
  ]
}

export function getLiquidityAfterDeposit(wethLiquidity: number, usdtLiquidity: number, wethPortfolio: number, usdtPortfolio: number) {
  const [wethDeposit, usdtDeposit] = getDeposits(wethLiquidity, usdtLiquidity, wethPortfolio, usdtPortfolio)
  return [
    wethLiquidity + wethDeposit,
    usdtLiquidity + usdtDeposit,
  ]
}

export function getDeposits(wethLiquidity: number, usdtLiquidity: number, wethPortfolio: number, usdtPortfolio: number) {
  const priceOfLiquidity = usdtLiquidity / wethLiquidity
  const priceOfPortfolio = usdtPortfolio / wethPortfolio
  if (priceOfPortfolio > priceOfLiquidity) {
    return [wethPortfolio, wethPortfolio / priceOfLiquidity]
  } else {
    return [usdtPortfolio / priceOfLiquidity, usdtPortfolio]
  }
}

export function getLiquidityAfterSell(wethLiquidity: number, usdtLiquidity: number, wethVolume: number) {
  return [
    wethLiquidity + wethVolume,
    usdtLiquidity + getUsdtVolume(wethLiquidity, usdtLiquidity, wethVolume),
  ]
}

export function getLiquidityAfterBuy(wethLiquidity: number, usdtLiquidity: number, usdtVolume: number) {
  return [
    wethLiquidity + getWethVolume(wethLiquidity, usdtLiquidity, usdtVolume),
    usdtLiquidity + usdtVolume,
  ]
}

export function getWethVolume(wethLiquidity: number, usdtLiquidity: number, usdtVolume: number) {
  // using inverted argument order to calculate volume for base currency (WETH)
  return getVolume(usdtLiquidity, wethLiquidity, usdtVolume)
}

export function getUsdtVolume(wethLiquidity: number, usdtLiquidity: number, wethVolume: number) {
  // using normal argument order to calculate volume for quote currency (USDT)
  return getVolume(wethLiquidity, usdtLiquidity, wethVolume)
}

export function getVolume(x: number, y: number, dx: number) {
  // Uniswap formula:
  // (x * y) = k
  // (x + dx) * (y + dy) = k
  // (x + dx) * (y + dy) = (x * y)
  // (y + dy) = (x * y) / (x + dx)
  // dy = (x * y) / (x + dx) - y
  expect(x).to.be.greaterThan(0)
  expect(y).to.be.greaterThan(0)
  expect(dx).to.be.greaterThan(0)
  const $dx = dx - dx * fee
  return (x * y) / (x + $dx) - y
}

export function getWethVolumeForStablePrice(wethLiquidity: number, usdtLiquidity: number, usdtVolume: number) {
  const [wethLiquidityAfterBuy, usdtLiquidityAfterBuy] = getLiquidityAfterBuy(wethLiquidity, usdtLiquidity, usdtVolume)
  const wethBalanceDiff = wethLiquidity - wethLiquidityAfterBuy
  expect(wethBalanceDiff).to.be.greaterThan(0)
  return wethBalanceDiff / fee
}

export type Scenario = {
  // WETH-USDT pair: https://v2.info.uniswap.org/pair/0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852
  wethLiquidity: number
  usdtLiquidity: number
  wethVolume: number
  usdtVolume: number
  wethPortfolio: number
  usdtPortfolio: number
  priceIsStable: boolean
}

export const Default: Scenario = {
  wethLiquidity: 25000,
  usdtLiquidity: 100000000,
  wethVolume: 0,
  usdtVolume: 0,
  wethPortfolio: 0,
  usdtPortfolio: 1000000,
  priceIsStable: true,
}

export const HighVolumeRange: Scenario = Object.assign({}, Default, {
  wethVolume: getWethVolumeForStablePrice(Default.wethLiquidity, Default.usdtLiquidity, 500 * Default.usdtLiquidity),
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
