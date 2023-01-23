import { ethers } from 'hardhat'
import { getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { BigNumber } from 'ethers'
import { beforeEach, Context } from 'mocha'
import { ColiquiditySimulation } from '../support/Simulation/ColiquiditySimulation'
import $debug from 'debug'
import { fest } from '../../utils-local/mocha'

describe('ColiquiditySimulation', async function () {
  let simulation: ColiquiditySimulation
  let snapshot: unknown

  before(async () => {
    simulation = await ColiquiditySimulation.create(
      BigNumber.from('1000000000000'),
      BigNumber.from('1000000000'),
      BigNumber.from('100000000'),
      BigNumber.from('100000'),
      BigNumber.from('5'),
      BigNumber.from('10'),
      BigNumber.from('10'),
      $debug('ColiquiditySimulation'),
      ethers,
    )
  })

  beforeEach(async function () {
    snapshot = await getSnapshot()
  })

  afterEach(async function () {
    await revertToSnapshot([snapshot])
  })

  fest('must calculate coliquidity profit', async function (this: Context) {
    if (!process.env.SIMULATE) return this.skip()
    this.timeout(300000)
    await simulation.run()
  })

})
