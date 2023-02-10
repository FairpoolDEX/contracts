import { fest } from '../../utils-local/mocha'
import { Action, Balance, buy, Context, getAmount, getBalancesEvolution, selloff, Wallet } from '../../libs/fairpool/formulas/uni'
import { sequentialReduce, sequentialReducePush } from '../../libs/utils/promise'
import { ensure } from '../../libs/utils/ensure'
import { isDescending } from '../../libs/utils/arithmetic/isDescending'
import { assert, bigInt, integer, nat, property } from 'fast-check'
import { createPipe, last, map, times } from 'remeda'
import { sum } from '../../libs/utils/arithmetic/sum'
import { getDeltas } from '../../libs/utils/arithmetic/getDeltas'
import { getBalancesGenInitial } from '../../libs/finance/models/BalanceGen/getBalancesGenInitial'
import { getAssertReplayParameters } from '../../libs/utils/fast-check/replay'
import { uint256Max } from '../../libs/bn/constants'
import { BigIntArithmetic } from '../../libs/utils/bigint/BigIntArithmetic'
import { withSkips } from '../../libs/utils/fast-check/withSkips'
import { MutatorV } from '../../libs/generic/models/Mutator'
import { debug } from '../../libs/utils/debug'

type N = bigint

describe('Uni formulas', () => {
  const arithmetic = BigIntArithmetic
  const wallets = ['contract', 'alice', 'bob']
  const assets = ['ABC', 'ETH']
  const [contract, alice, bob] = wallets
  const [base, quote] = assets
  const { zero, one, num, add, sub, mul, div, eq, lt, gt, lte, gte } = arithmetic
  const ratio = 5n
  ensure(ratio > 1, new Error('Price must grow sub-linearly at the start, but super-linearly after baseSupply > (baseLimit - quoteBuffer)'))
  const baseLimitConstraints = { min: 100000n, max: uint256Max.toBigInt() }
  const quoteBufferConstraints = { min: div(baseLimitConstraints.min, ratio), max: uint256Max.toBigInt() }
  const quoteDeltaConstraints = { min: 1n, max: uint256Max.toBigInt() }
  const baseLimit = baseLimitConstraints.min
  const quoteBuffer = div(baseLimit, ratio)
  const context: Context<N> = {
    arithmetic,
    baseAsset: base,
    quoteAsset: quote,
    baseLimit,
    quoteBuffer,
  }
  // const quoteDelta = num(100)
  const balancesInitial: Balance<N>[] = getBalancesGenInitial(zero)(wallets, assets)
  const getDeltasA = getDeltas(arithmetic)
  const isDescendingA = isDescending(arithmetic)
  const getBalancesEvolutionBaseAlice = getBalancesEvolution<N>(base, alice)
  const getAmountsEvolutionBaseAlice = createPipe(getBalancesEvolutionBaseAlice, map(b => b.amount))
  const sumAmountsEvolutionBaseAlice = createPipe(getAmountsEvolutionBaseAlice, sum(arithmetic))
  const sequentialReducePushWithSeparator = <Val, Args extends unknown[]>(mutators: MutatorV<Val, Args>[], ...args: Args) => (value: Val) => {
    const separator = '---'
    const mutatorsWithSeparator = mutators.map<MutatorV<Val, Args>>(mutator => (obj, ...args) => {
      debug(__filename, sequentialReducePushWithSeparator, '---')
      return mutator(obj, ...args)
    })
    const results = sequentialReducePush(mutatorsWithSeparator, ...args)(value)
    debug(__filename, sequentialReducePushWithSeparator, '---')
    return results
  }
  const getProfit = (sender: Wallet) => (actions: Action<N>[]) => {
    const balancesEvolution = sequentialReducePushWithSeparator(actions)(balancesInitial)
    // console.log('peek', toString(ctx.quoteBuffer), toString(ctx.baseLimit), toString(quoteDelta), balancesEvolution.map(getBalancesRendered))
    const balancesFinal = last(balancesEvolution)
    const getAmountLocal = getAmount(quote)(sender)
    const amountInitial = getAmountLocal(balancesInitial)
    const amountFinal = getAmountLocal(balancesFinal)
    return sub(amountFinal, amountInitial)
  }
  const getActionsToProfitGeneric = (quoteDeltaAlice: N, quoteDeltaBob: N) => (ctx: Context<N>) => {
    return [
      buy(ctx)(contract, alice, quoteDeltaAlice),
      buy(ctx)(contract, bob, quoteDeltaBob),
      selloff(ctx)(contract, alice),
    ]
  }
  const getActionsToProfitSimple = (quoteDelta: N) => getActionsToProfitGeneric(quoteDelta, mul(quoteDelta, num(100)))
  const getProfitAliceGeneric = (quoteDeltaAlice: N, quoteDeltaBob: N) => (ctx: Context<N>) => getProfit(alice)(getActionsToProfitGeneric(quoteDeltaAlice, quoteDeltaBob)(ctx))
  const getProfitAliceSimple = (quoteDelta: N) => (ctx: Context<N>) => getProfit(alice)(getActionsToProfitSimple(quoteDelta)(ctx))

  fest('a sequence of buy transactions should give progressively smaller base amounts', async () => {
    const anyCount = nat({ max: 100 })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyCount, anyQuoteDelta, withSkips((count: number, quoteDelta: N) => {
      const actions = times(count, () => buy(context)(contract, alice, quoteDelta))
      const balancesEvolution = sequentialReducePushWithSeparator(actions)(balancesInitial)
      const amountsBaseSenderEvolution = getAmountsEvolutionBaseAlice(balancesEvolution)
      // const balancesEvolutionBaseSenderRendered = balancesBaseSenderEvolution.map(b => b.amount.toString())
      // console.log('balancesEvolutionBaseSenderRendered', balancesEvolutionBaseSenderRendered)
      return isDescendingA(amountsBaseSenderEvolution)
    })), getAssertReplayParameters())
  })

  fest('sum of buys must be almost equal to buy of sums', async () => {
    const anyCount = integer({ min: 1, max: 100 })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyCount, anyQuoteDelta, withSkips((count: number, quoteDelta: N) => {
      const amountsBaseFinal = [1, count].map(cnt => {
        const quoteDeltaPerAction = div(quoteDelta, num(cnt))
        const actions = times(cnt, () => buy(context)(contract, alice, quoteDeltaPerAction))
        const balances = sequentialReduce(actions)(balancesInitial)
        return getAmount(base)(alice)(balances)
      })
      const deviations = getDeltasA(amountsBaseFinal).slice(1)
      /**
       * small deviations are allowed due to rounding errors
       */
      return deviations.every(lte(num(1)))
    })), getAssertReplayParameters())
  })

  /**
   * higher quoteBuffer -> lower profit
   */
  fest('quoteBuffer has inverse influence on profit', async () => {
    const minQuoteBufferIncrement = div(context.quoteBuffer, num(5)) // otherwise the difference between old quoteBuffer and new quoteBuffer becomes too small
    const anyQuoteBufferIncrement = bigInt({ min: minQuoteBufferIncrement })
    const anyQuoteDelta = bigInt({ ...quoteDeltaConstraints, min: num(100) })
    assert(property(anyQuoteBufferIncrement, anyQuoteDelta, withSkips((quoteBufferIncrement: N, quoteDelta: N) => {
      const context0 = context
      const context1 = { ...context, quoteBuffer: add(context.quoteBuffer, quoteBufferIncrement) }
      const profits = [context0, context1].map(getProfitAliceSimple(quoteDelta))
      const deviations = getDeltasA(profits).slice(1)
      return deviations.every(lte(num(-1)))
    })), getAssertReplayParameters())
  })

  fest('baseLimit has zero influence on profit', async () => {
    const minBaseLimitIncrement = num(1)
    const anyBaseLimitIncrement = bigInt({ min: minBaseLimitIncrement })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyBaseLimitIncrement, anyQuoteDelta, withSkips((baseLimitIncrement: N, quoteDelta: N) => {
      const context0 = context
      const context1 = { ...context, baseLimit: add(context.baseLimit, baseLimitIncrement) }
      const profits = [context0, context1].map(getProfitAliceSimple(quoteDelta))
      const deviations = getDeltasA(profits).slice(1)
      return deviations.every(lte(num(1)))
    })), getAssertReplayParameters())
  })

  fest('3rd party buy orders have direct influence on profit', async () => {
    const quoteDeltaBobMultiplier = num(100) // otherwise the difference between profits becomes too small
    const minQuoteDeltaBobIncrement = num(100) // otherwise the difference between profits becomes too small
    const anyQuoteDeltaBobIncrement = bigInt({ ...quoteDeltaConstraints, min: minQuoteDeltaBobIncrement })
    const anyQuoteDeltaBob = bigInt(quoteDeltaConstraints)
    const anyQuoteDeltaAlice = bigInt(quoteDeltaConstraints)
    assert(property(anyQuoteDeltaBobIncrement, anyQuoteDeltaBob, anyQuoteDeltaAlice, withSkips(function isEveryDeviationOn3rdPartyOrdersGte1(quoteDeltaBobIncrement: N, quoteDeltaBob: N, quoteDeltaAlice: N) {
      debug(__filename, isEveryDeviationOn3rdPartyOrdersGte1, quoteDeltaBobIncrement, quoteDeltaBob, quoteDeltaAlice)
      const profits = [
        quoteDeltaBob,
        add(quoteDeltaBob, quoteDeltaBobIncrement),
      ]
        .map(mul(quoteDeltaBobMultiplier))
        .map(qdb => getProfitAliceGeneric(quoteDeltaAlice, qdb)(context))
      const deviations = getDeltasA(profits).slice(1)
      return deviations.every(gte(num(1)))
    })), getAssertReplayParameters())
  })

})
