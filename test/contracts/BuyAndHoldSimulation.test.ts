import { expect } from '../../util/expect'
import { flatten, fromPairs, zip } from 'lodash'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { hours, MaxUint256, scale } from '../support/all.helpers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot, $zero } from '../support/test.helpers'
import { BaseToken, QuoteToken, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02, WETH9 } from '../../typechain'
import { BigNumber, Contract } from 'ethers'
import { beforeEach, Context } from 'mocha'
import { deployUniswapPair, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory } from '../support/Uniswap.helpers'
import { BuyAndHoldSimulation } from '../support/Simulation/BuyAndHoldSimulation'
import $debug from 'debug'
import { TokenModel } from '../support/fast-check/models/TokenModel'

describe('BuyAndHoldSimulation', async function () {
  let simulation: BuyAndHoldSimulation
  let snapshot: unknown

  before(async () => {
    simulation = await BuyAndHoldSimulation.create(
      BigNumber.from('1000000000000'),
      BigNumber.from('1000000000'),
      BigNumber.from('100000000'),
      BigNumber.from('100000'),
      BigNumber.from('5'),
      BigNumber.from('10'),
      BigNumber.from('10'),
      $debug('BuyAndHoldSimulation'),
      ethers,
    )
  })

  beforeEach(async function () {
    snapshot = await getSnapshot()
  })

  afterEach(async function () {
    await revertToSnapshot([snapshot])
  })

  it('must calculate trading profit', async function (this: Context) {
    if (!process.env.SIMULATE) return this.skip()
    this.timeout(300000)
    await simulation.run()
  })

})
