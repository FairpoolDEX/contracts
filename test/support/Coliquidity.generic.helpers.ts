export function getLiquidityAfterDeposit(baseLiquidity: number, quoteLiquidity: number, basePortfolio: number, quotePortfolio: number) {
  const [baseDeposit, quoteDeposit] = getDeposits(baseLiquidity, quoteLiquidity, basePortfolio, quotePortfolio)
  return [
    baseLiquidity + baseDeposit,
    quoteLiquidity + quoteDeposit,
  ]
}

/**
 * Requirements:
 * - baseLiquidity = baseLiquidityBeforeDeposit + baseDeposit
 * - quoteLiquidity = quoteLiquidityBeforeDeposit + quoteDeposit
 */
export function getLiquidityPoolShare(baseLiquidity: number, quoteLiquidity: number, baseDeposit: number, quoteDeposit: number) {
  const basePoolShare = baseDeposit / baseLiquidity
  const quotePoolShare = quoteDeposit / quoteLiquidity
  if (Math.abs(basePoolShare - quotePoolShare) > 0.01) throw new Error('basePoolShare and quotePoolShare must equivalent up to FP arithmetic error')
  return basePoolShare
}

export function getDeposits(baseLiquidity: number, quoteLiquidity: number, basePortfolio: number, quotePortfolio: number) {
  const priceOfLiquidity = quoteLiquidity / baseLiquidity
  const priceOfPortfolio = quotePortfolio / basePortfolio
  if (priceOfPortfolio > priceOfLiquidity) {
    return [basePortfolio, basePortfolio / priceOfLiquidity]
  } else {
    return [quotePortfolio / priceOfLiquidity, quotePortfolio]
  }
}

export function getLiquidityAfterSell(baseLiquidity: number, quoteLiquidity: number, baseVolume: number, fee: number): [number, number] {
  return [
    baseLiquidity + baseVolume,
    quoteLiquidity + getQuoteVolume(baseLiquidity, quoteLiquidity, baseVolume, fee),
  ]
}

export function getLiquidityAfterBuy(baseLiquidity: number, quoteLiquidity: number, quoteVolume: number, fee: number): [number, number] {
  return [
    baseLiquidity + getBaseVolume(baseLiquidity, quoteLiquidity, quoteVolume, fee),
    quoteLiquidity + quoteVolume,
  ]
}

export function getBaseVolume(baseLiquidity: number, quoteLiquidity: number, quoteVolume: number, fee: number) {
  // using inverted argument order to calculate volume for base currency (BASE)
  return getVolume(quoteLiquidity, baseLiquidity, quoteVolume, fee)
}

export function getQuoteVolume(baseLiquidity: number, quoteLiquidity: number, baseVolume: number, fee: number) {
  // using normal argument order to calculate volume for quote currency (QUOTE)
  return getVolume(baseLiquidity, quoteLiquidity, baseVolume, fee)
}

export function getVolume(x: number, y: number, dx: number, fee: number) {
  // Uniswap formula:
  // (x * y) = k
  // (x + dx) * (y + dy) = k
  // (x + dx) * (y + dy) = (x * y)
  // (y + dy) = (x * y) / (x + dx)
  // dy = (x * y) / (x + dx) - y
  if (x <= 0) throw new Error('x must be greater than 0')
  if (y <= 0) throw new Error('y must be greater than 0')
  if (dx <= 0) throw new Error('dx must be greater than 0')
  const $dx = dx - dx * fee
  return Math.trunc((x * y) / (x + $dx) - y)
}

export function getBaseVolumeForStablePrice(baseLiquidity: number, quoteLiquidity: number, quoteVolume: number, fee: number) {
  const [baseLiquidityAfterBuy, quoteLiquidityAfterBuy] = getLiquidityAfterBuy(baseLiquidity, quoteLiquidity, quoteVolume, fee)
  const baseBalanceDiff = baseLiquidity - baseLiquidityAfterBuy
  if (baseBalanceDiff <= 0) throw new Error('baseBalanceDiff must be greater than 0')
  return baseBalanceDiff / fee
}
