import { fest } from '../../utils-local/mocha'
import { Action, Balance, BalanceTuple, buy, Context, getAmount, getAmountsBQ, getBalance, getBalancesBQ, getBalancesEvolution, getBaseSupply, getQuoteSupplyAcceptableMax, getStats, Params, selloff, Wallet } from '../../libs/fairpool/formulas/uni'
import { sequentialReduce, sequentialReducePush } from '../../libs/utils/promise'
import { isDescending } from '../../libs/utils/arithmetic/isDescending'
import { assert, bigInt, integer, nat, property, record } from 'fast-check'
import { clone, countBy, createPipe, equals, last, map, pipe, range, times, uniq } from 'remeda'
import { sum } from '../../libs/utils/arithmetic/sum'
import { getDeltas } from '../../libs/utils/arithmetic/getDeltas'
import { getBalancesGenInitial } from '../../libs/finance/models/BalanceGen/getBalancesGenInitial'
import { getAssertParametersForReplay } from '../../libs/utils/fast-check/replay'
import { uint256Max } from '../../libs/bn/constants'
import { BigIntArithmetic } from '../../libs/utils/bigint/BigIntArithmetic'
import { withSkips } from '../../libs/utils/fast-check/withSkips'
import { MutatorV } from '../../libs/generic/models/Mutator'
import { debug, input, inter, output } from '../../libs/utils/debug'
import { assertBy } from '../../libs/utils/assert'
import { toQuotients } from './arbitraries/toQuotients'
import { toBoundedArray } from './arbitraries/toBoundedArray'
import { getNumerators } from './arbitraries/getNumerators'

type N = bigint

interface PreContext<N> {
  quoteOffset: N
  baseLimitMultiplier: N
}

describe('Uni formulas', () => {
  const arithmetic = BigIntArithmetic
  const { zero, one, num, add, sub, mul, div, min, max, abs, sqrt, eq, lt, gt, lte, gte } = arithmetic
  const wallets = ['contract', 'alice', 'bob']
  const assets = ['ABC', 'ETH']
  const [contract, alice, bob] = wallets
  const [base, quote] = assets
  const quoteDeltaMin = 1n
  const quoteOffsetConstraints = { min: 1000n, max: uint256Max.toBigInt() }
  const baseLimitMultiplierConstraints = { min: 2n, max: 200n }
  assertBy(gte)(baseLimitMultiplierConstraints.min, 2n, 'baseLimitMultiplierConstraints.min', '2n', 'Price must grow sub-linearly at the start, but super-linearly after baseSupply > (baseLimit - quoteOffset)')
  const paramsArb = record<PreContext<N>>({
    quoteOffset: bigInt(quoteOffsetConstraints),
    baseLimitMultiplier: bigInt(baseLimitMultiplierConstraints),
  }).map(({ quoteOffset, baseLimitMultiplier }) => ({
    quoteOffset,
    baseLimit: mul(quoteOffset, baseLimitMultiplier),
  }))
  const quoteDeltaConstraints = { min: 10n, max: 1n } // TODO: fix this var
  const getParams = (pre: PreContext<N>) => ({ baseLimit: mul(pre.quoteOffset, pre.baseLimitMultiplier), quoteOffset: pre.quoteOffset })
  const getContext = (params: Params<N>): Context<N> => ({ arithmetic, baseAsset: base, quoteAsset: quote, ...params })
  const contextDefault = getContext({ baseLimit: 1000000n, quoteOffset: 20000n })
  const quoteDeltaDefault = num(1)
  // const baseLimit = baseLimitConstraints.min
  // const quoteOffset = div(baseLimit, ratio)
  // const getContext = (params: )= {
  //   arithmetic,
  //   baseAsset: base,
  //   quoteAsset: quote,
  // }
  // const quoteDelta = num(100)
  const balancesInitial: Balance<N>[] = getBalancesGenInitial(zero)(wallets, assets)
  const getDeltasA = getDeltas(arithmetic)
  const isDescendingA = isDescending(arithmetic)
  const getBalances = getBalancesBQ(base, quote)
  const getAmounts = getAmountsBQ(base, quote)
  const getBalancesEvolutionBaseAlice = getBalancesEvolution<N>(base, alice)
  const getAmountsEvolutionBaseAlice = createPipe(getBalancesEvolutionBaseAlice, map(b => b.amount))
  const sumAmountsEvolutionBaseAlice = createPipe(getAmountsEvolutionBaseAlice, sum(arithmetic))
  const run = <Val, Args extends unknown[]>(mutators: MutatorV<Val, Args>[], ...args: Args) => (value: Val) => {
    const separator = '---'
    const mutatorsWithSeparator = mutators.map<MutatorV<Val, Args>>(mutator => (obj, ...args) => {
      debug(__filename, run, '---')
      return mutator(obj, ...args)
    })
    const results = sequentialReducePush(mutatorsWithSeparator, ...args)(value)
    debug(__filename, run, '---')
    return results
  }
  const getProfit = (sender: Wallet) => (actions: Action<N>[]) => {
    const balancesEvolution = run(actions)(balancesInitial)
    // console.log('peek', toString(ctx.quoteOffset), toString(ctx.baseLimit), toString(quoteDelta), balancesEvolution.map(getBalancesRendered))
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

  fest.skip('must run experiments', async () => {
    // const scale = 1n
    const scale = 10n ** 18n
    const start = 0
    const end = 10
    const multiplier = 1
    // const context$ = {
    //   ...context,
    //   baseLimit: 1000000n,
    //   quoteOffset: 100n,
    // }
    const context = getContext({ baseLimit: 1000000n, quoteOffset: 20000n })
    const stats = getStats(context)(scale)(start, end, multiplier)
    stats.map((s) => {
      const suffix = s.isOptimal ? 'Optimal!' : ''
      console.info(s.baseSupplyCalc, s.quoteSupply, s.quoteSupplyCalc, s.diff, suffix)
    })
    const optimalCount = countBy(stats, s => s.isOptimal)
    console.info('optimalCount', optimalCount)
    const uniqueCount = uniq(stats.map(s => s.baseSupplyCalc)).length
    console.info('uniqueCount', uniqueCount)
    const quoteSupplyAcceptableMax = getQuoteSupplyAcceptableMax(context.arithmetic)(context.baseLimit, context.quoteOffset)
    console.info('quoteSupplyAcceptableMax', quoteSupplyAcceptableMax)
  })

  fest.skip('must show prices', async () => {
    const baseLimit = 1000000n
    const quoteOffset = 10000n
    const quoteSupplyMaxN = 100
    const quoteSupplyArr = range(1, quoteSupplyMaxN).map(num)
    const baseSupplyArr = quoteSupplyArr.map(getBaseSupply(arithmetic)(baseLimit, quoteOffset))
    const prices = getDeltasA(baseSupplyArr)
    console.info('prices', prices)
    console.info({ baseLimit, quoteOffset, quoteSupplyMaxN })
    prices.map(p => console.info(p))
  })

  fest('a static buy-sell cycle must work as expected', async () => {
    const withAssertAmounts = (action: Action<N>, assert: (balances: Balance<N>[]) => void) => (balancesIn: Balance<N>[]) => {
      const balances = action(balancesIn)
      assert(balances)
      return balances
    }
    const fromBalanceTuplesToAsserter = (tuples: BalanceTuple<N>[]) => (balances: Balance<N>[]) => tuples.map((tuple) => {
      const [wallet, asset, amount] = tuple
      const balance = getBalance(asset)(wallet)(balances)
      assertBy(equals)(balance.amount, amount, `${wallet}.${asset}`, amount.toString())
    })
    const withAssertAmountsStatic = (action: Action<N>, tuples: BalanceTuple<N>[]) => withAssertAmounts(action, fromBalanceTuplesToAsserter(tuples))
    run([
      withAssertAmountsStatic(
        buy(contextDefault)(contract, alice, quoteDeltaDefault),
        [
          [alice, base, num(4)],
          [alice, quote, num(-2)],
          [bob, base, zero],
          [bob, quote, zero],
        ]
      ),
    ])
  })

  /**
   * Currently this happens by definition since sell() has a special case
   */
  fest.skip('a buy-sell cycle must return initial balances', async () => {
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyQuoteDelta, withSkips((quoteDelta: N) => {
      const actions = [
        buy(contextDefault)(contract, alice, quoteDelta),
        selloff(contextDefault)(contract, alice),
      ]
      const balancesEvolution = run(actions)(balancesInitial)
      const balancesFinal = last(balancesEvolution)
      assertBy(equals)(balancesFinal, balancesInitial, 'balancesFinal', 'balancesInitial')
    })), getAssertParametersForReplay())
  })

  fest.skip('a sequence of buy transactions must give progressively smaller base amounts', async () => {
    const anyCount = nat({ max: 100 })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyCount, anyQuoteDelta, withSkips((count: number, quoteDelta: N) => {
      const actions = times(count, () => buy(contextDefault)(contract, alice, quoteDelta))
      const balancesEvolution = run(actions)(balancesInitial)
      const amountsBaseSenderEvolution = getAmountsEvolutionBaseAlice(balancesEvolution)
      // const balancesEvolutionBaseSenderRendered = balancesBaseSenderEvolution.map(b => b.amount.toString())
      // console.log('balancesEvolutionBaseSenderRendered', balancesEvolutionBaseSenderRendered)
      return isDescendingA(amountsBaseSenderEvolution)
    })), getAssertParametersForReplay())
  })

  fest.skip('sum of buys must be almost equal to buy of sums', async () => {
    const anyCount = integer({ min: 1, max: 100 })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyCount, anyQuoteDelta, withSkips((count: number, quoteDelta: N) => {
      const amountsBaseFinal = [1, count].map(cnt => {
        const quoteDeltaPerAction = div(quoteDelta, num(cnt))
        const actions = times(cnt, () => buy(contextDefault)(contract, alice, quoteDeltaPerAction))
        const balances = sequentialReduce(actions)(balancesInitial)
        return getAmount(base)(alice)(balances)
      })
      const deviations = getDeltasA(amountsBaseFinal).slice(1)
      /**
       * small deviations are allowed due to rounding errors
       */
      return deviations.every(lte(num(1)))
    })), getAssertParametersForReplay())
  })

  /**
   * higher quoteOffset -> lower profit
   */
  fest.skip('quoteOffset has inverse influence on profit', async () => {
    const minQuoteOffsetIncrement = div(contextDefault.quoteOffset, num(5)) // otherwise the difference between old quoteOffset and new quoteOffset becomes too small
    const anyQuoteOffsetIncrement = bigInt({ min: minQuoteOffsetIncrement })
    const anyQuoteDelta = bigInt({ ...quoteDeltaConstraints, min: num(100) })
    assert(property(anyQuoteOffsetIncrement, anyQuoteDelta, withSkips((quoteOffsetIncrement: N, quoteDelta: N) => {
      const context0 = contextDefault
      const context1 = { ...contextDefault, quoteOffset: add(contextDefault.quoteOffset, quoteOffsetIncrement) }
      const profits = [context0, context1].map(getProfitAliceSimple(quoteDelta))
      const deviations = getDeltasA(profits).slice(1)
      return deviations.every(lte(num(-1)))
    })), getAssertParametersForReplay())
  })

  fest.skip('baseLimit has zero influence on profit', async () => {
    const minBaseLimitIncrement = num(1)
    const anyBaseLimitIncrement = bigInt({ min: minBaseLimitIncrement })
    const anyQuoteDelta = bigInt(quoteDeltaConstraints)
    assert(property(anyBaseLimitIncrement, anyQuoteDelta, withSkips((baseLimitIncrement: N, quoteDelta: N) => {
      const context0 = contextDefault
      const context1 = { ...contextDefault, baseLimit: add(contextDefault.baseLimit, baseLimitIncrement) }
      const profits = [context0, context1].map(getProfitAliceSimple(quoteDelta))
      const deviations = getDeltasA(profits).slice(1)
      return deviations.every(lte(num(1)))
    })), getAssertParametersForReplay())
  })

  fest.skip('3rd party buy orders have direct influence on profit', async () => {
    const quoteDeltaMin = num(100) // otherwise the difference between profits becomes too small
    const numeratorsArb = getNumerators(2)
    const quoteDeltaBobMultiplierArb = bigInt({ min: 2n, max: 100n })
    const argsArb = record({
      params: paramsArb,
      numerators: numeratorsArb,
      quoteDeltaBobMultiplier: quoteDeltaBobMultiplierArb,
    }).map(function mapArgs(args) {
      input(__filename, mapArgs, args)
      const { params, numerators, quoteDeltaBobMultiplier } = args
      // NOTE: multiply baseLimit by quoteDeltaBobMultiplier ^ 2 to ensure that quoteSupplyAcceptableMax gte sum of quoteDeltas
      const upscale = mul(quoteDeltaBobMultiplier)
      const baseLimit = pipe(params.baseLimit, upscale, upscale)
      const quoteOffset = params.quoteOffset
      const quoteSupplyAcceptableMax = getQuoteSupplyAcceptableMax(arithmetic)(baseLimit, quoteOffset)
      inter(__filename, mapArgs, { baseLimit, quoteOffset, quoteSupplyAcceptableMax })
      const quoteSupplyMax = div(quoteSupplyAcceptableMax, quoteDeltaBobMultiplier) // need to divide by multiplier to keep the final sum of quoteDeltas under the quoteSupplyAcceptableMax
      // const quoteDeltaMax = getQuoteDeltaMax(arithmetic)(baseLimit, quoteOffset)
      // const quoteDeltaBobIncrement = bigInt({ min: minQuoteDeltaBobIncrement, max: quoteDeltaMax })
      // const quoteDeltaBob = bigInt({ min: quoteDeltaMin, max: quoteDeltaMax })
      // const quoteDeltaAlice = bigInt({ min: quoteDeltaMin, max: quoteDeltaMax })
      const toQuotientsLocal = toQuotients(arithmetic)
      const toBoundedArrayLocal = toBoundedArray(arithmetic)(quoteDeltaMin, quoteSupplyMax)
      const quoteDeltas = pipe(numerators.map(num), toQuotientsLocal, toBoundedArrayLocal)
      const quoteDeltasA = clone(quoteDeltas)
      const quoteDeltasB = clone(quoteDeltas)
      quoteDeltasB[1] = mul(quoteDeltasB[1], quoteDeltaBobMultiplier)
      const scenarios = [quoteDeltasA, quoteDeltasB]
      scenarios.map(quoteDeltas => {
        const quoteDeltasSum = sum(arithmetic)(quoteDeltas)
        return assertBy(lte)(quoteDeltasSum, quoteSupplyAcceptableMax, 'quoteDeltasSum', 'quoteSupplyAcceptableMax')
      })
      return output(__filename, mapArgs, { baseLimit, quoteOffset, scenarios, quoteSupplyAcceptableMax })
    })
    assert(property(argsArb, function isEveryDeviationOn3rdPartyOrdersGte1(args) {
      input(__filename, isEveryDeviationOn3rdPartyOrdersGte1, args)
      const { scenarios } = args
      const context = getContext(args)
      const profits = scenarios.map(([quoteDeltaAlice, quoteDeltaBob]) => {
        return getProfitAliceGeneric(quoteDeltaAlice, quoteDeltaBob)(context)
      })
      const deviations = getDeltasA(profits).slice(1)
      return deviations.every(gte(num(1)))
    }), getAssertParametersForReplay({ verbose: true }))
  })

})
