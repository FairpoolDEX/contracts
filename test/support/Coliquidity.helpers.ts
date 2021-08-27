import { expect } from "../../util/expect"

export const fee = 0.003 // equal to 0.3%

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
  return Math.trunc((x * y) / (x + $dx) - y)
}

export function getWethVolumeForStablePrice(wethLiquidity: number, usdtLiquidity: number, usdtVolume: number) {
  const [wethLiquidityAfterBuy, usdtLiquidityAfterBuy] = getLiquidityAfterBuy(wethLiquidity, usdtLiquidity, usdtVolume)
  const wethBalanceDiff = wethLiquidity - wethLiquidityAfterBuy
  expect(wethBalanceDiff).to.be.greaterThan(0)
  return wethBalanceDiff / fee
}
