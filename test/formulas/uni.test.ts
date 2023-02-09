import { fest } from '../../utils-local/mocha'
import { Balance, buy, byAssetWallet, Context, getBalancesEvolution, selloff } from '../../libs/fairpool/formulas/uni'
import { sequentialReduce, sequentialReducePush } from '../../libs/utils/promise'
import { ensure, getFinder } from '../../libs/utils/ensure'
import { isDescending } from '../../libs/utils/arithmetic/isDescending'
import { assert, bigInt, integer, nat, pre, property } from 'fast-check'
import { createPipe, last, map, times } from 'remeda'
import { sum } from '../../libs/utils/arithmetic/sum'
import { getDeltas } from '../../libs/utils/arithmetic/getDeltas'
import { getBalancesGenInitial } from '../../libs/finance/models/BalanceGen/getBalancesGenInitial'
import { getAssertReplayParameters } from '../../libs/utils/fast-check/replay'
import { uint256Max } from '../../libs/bn/constants'
import { BigIntArithmetic } from '../../libs/utils/bigint/BigIntArithmetic'
import { AssertionFailedError } from '../../libs/utils/error'

type N = bigint

xdescribe('Uni formulas', () => {
  const arithmetic = BigIntArithmetic
  const wallets = ['contract', 'alice', 'bob']
  const assets = ['ABC', 'ETH']
  const [contract, alice, bob] = wallets
  const [baseAsset, quoteAsset] = assets
  const { zero, one, num, add, sub, mul, div, eq, lt, gt, lte, gte } = arithmetic
  const ratio = 5n
  ensure(ratio > 1, new Error('Price must grow sub-linearly at the start, but super-linearly after baseSupply > (baseLimit - quoteBuffer)'))
  const baseLimitConstraints = { min: 100000n, max: uint256Max.toBigInt() }
  const quoteBufferConstraints = { min: 1000n, max: uint256Max.toBigInt() }
  const quoteDeltaConstraints = { min: 0n, max: uint256Max.toBigInt() }
  const baseLimit = baseLimitConstraints.min
  const quoteBuffer = div(baseLimit, ratio)
  const context: Context<N> = {
    arithmetic,
    baseAsset,
    quoteAsset,
    baseLimit,
    quoteBuffer,
  }
  // const quoteDelta = num(100)
  const balancesInitial: Balance<N>[] = getBalancesGenInitial(zero)(wallets, assets)
  const getDeltasA = getDeltas(arithmetic)
  const isDescendingA = isDescending(arithmetic)
  const getBalancesEvolutionBaseAlice = getBalancesEvolution<N>(baseAsset, alice)
  const getAmountsEvolutionBaseAlice = createPipe(getBalancesEvolutionBaseAlice, map(b => b.amount))
  const sumAmountsEvolutionBaseAlice = createPipe(getAmountsEvolutionBaseAlice, sum(arithmetic))
  const getBalanceBaseAlice = getFinder(byAssetWallet(baseAsset, alice))
  const getBalanceQuoteAlice = getFinder(byAssetWallet(quoteAsset, alice))
  const getAmountBaseAlice = createPipe(getBalanceQuoteAlice, b => b.amount)
  const getAmountQuoteAlice = createPipe(getBalanceQuoteAlice, b => b.amount)
  const getProfit = (quoteDelta: N) => (ctx: Context<N>) => {
    // console.log('params', toString(ctx.baseLimit), toString(quoteDelta))
    const actions = [
      buy(ctx)(contract, alice, quoteDelta),
      buy(ctx)(contract, bob, mul(quoteDelta, num(100))),
      selloff(ctx)(contract, alice),
    ]
    const balancesEvolution = sequentialReducePush(actions)(balancesInitial)
    // console.log('peek', toString(ctx.quoteBuffer), toString(ctx.baseLimit), toString(quoteDelta), balancesEvolution.map(getBalancesRendered))
    const balancesFinal = last(balancesEvolution)
    const amountQuoteAliceInitial = getAmountQuoteAlice(balancesInitial)
    const amountQuoteAliceFinal = getAmountQuoteAlice(balancesFinal)
    return sub(amountQuoteAliceFinal, amountQuoteAliceInitial)
  }

  fest('a sequence of buy transactions should give progressively smaller base amounts', async () => {
    const anyCount = nat({ max: 100 })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyCount, anyQuoteDelta, (count: number, quoteDelta: N) => {
      const actions = times(count, () => buy(context)(contract, alice, quoteDelta))
      const balancesEvolution = sequentialReducePush(actions)(balancesInitial)
      const amountsBaseSenderEvolution = getAmountsEvolutionBaseAlice(balancesEvolution)
      // const balancesEvolutionBaseSenderRendered = balancesBaseSenderEvolution.map(b => b.amount.toString())
      // console.log('balancesEvolutionBaseSenderRendered', balancesEvolutionBaseSenderRendered)
      return isDescendingA(amountsBaseSenderEvolution)
    }), getAssertReplayParameters())
  })

  fest('sum of buys must be almost equal to buy of sums', async () => {
    const anyCount = integer({ min: 1, max: 100 })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyCount, anyQuoteDelta, (count: number, quoteDelta: N) => {
      const amountsBaseFinal = [1, count].map(cnt => {
        const quoteDeltaPerAction = div(quoteDelta, num(cnt))
        const actions = times(cnt, () => buy(context)(contract, alice, quoteDeltaPerAction))
        const balances = sequentialReduce(actions)(balancesInitial)
        return getBalanceBaseAlice(balances).amount
      })
      const deviations = getDeltasA(amountsBaseFinal).slice(1)
      // console.log('results', count, $quoteDelta, toStringA(amountsBaseFinal), toStringA(deviations), result)
      /**
       * small deviations are allowed due to rounding errors
       */
      return deviations.every(lt(num(1)))
    }), getAssertReplayParameters())
  })

  fest('quoteBuffer influences profit', async () => {
    const anyQuoteBuffer = bigInt(quoteBufferConstraints)
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyQuoteBuffer, anyQuoteDelta, (quoteBuffer: N, quoteDelta: N) => {
      const context0 = context
      const context1 = { ...context, quoteBuffer: quoteBuffer }
      const profits = [context0, context1].map(getProfit(quoteDelta))
      const deviations = getDeltasA(profits).slice(1)
      // console.log('results', toString(quoteBuffer), toString(quoteDelta), toStringA(profits), toStringA(deviations))
      return deviations.every(gt(num(1)))
    }), getAssertReplayParameters())
  })

  fest('baseLimit does not influence profit', async () => {
    const anyBaseLimit = bigInt(baseLimitConstraints)
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyBaseLimit, anyQuoteDelta, (baseLimit: N, quoteDelta: N) => {
      try {
        const context0 = context
        const context1 = { ...context, baseLimit }
        const profits = [context0, context1].map(getProfit(quoteDelta))
        const deviations = getDeltasA(profits).slice(1)
        // console.log('results', toString(quoteBuffer), toString(quoteDelta), toStringA(profits), toStringA(deviations))
        return deviations.every(lt(num(1)))
      } catch (e) {
        if (e instanceof AssertionFailedError) {
          pre(false) // skip the test
        } else {
          throw e
        }
      }
    }), getAssertReplayParameters())
  })

})
