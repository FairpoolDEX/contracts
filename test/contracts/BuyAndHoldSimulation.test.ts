import { ethers } from 'hardhat'
import { getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { BigNumber } from 'ethers'
import { beforeEach, Context } from 'mocha'
import { BuyAndHoldSimulation } from '../support/Simulation/BuyAndHoldSimulation'
import $debug from 'debug'
import { fest } from '../../util-local/mocha'

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

  fest('must calculate trading profit', async function (this: Context) {
    if (!process.env.SIMULATE) return this.skip()
    this.timeout(300000)
    await simulation.run()
  })

})
