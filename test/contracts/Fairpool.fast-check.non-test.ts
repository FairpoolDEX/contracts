import { assertPRD } from '../../libs/utils/fast-check/assert'
import { commandsArb } from '../arbitraries/commandsArb'
import { usersDefault } from '../../libs/fairpool/formulas/default'
import { asyncModelRun } from 'fast-check'
import { stateArb } from '../../libs/fairpool/formulas/uni.test'
import { festF } from '../../utils-local/mocha'
import { Fairpool, getFairpool, State } from '../../libs/fairpool/formulas/uni'
import { todo } from '../../libs/utils/todo'
import { Address } from '../../models/Address'
import { getRealFromModel, MRPS } from '../../libs/utils/fast-check/ModelRealPair'
import { DefaultPrecision } from '../../libs/fairpool/constants'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import hre, { ethers } from 'hardhat'
import { getRealShareParamsFromModel } from './Fairpool/getRealShareParamsFromModel'
import { Fairpool as FairpoolContract } from 'typechain-types'

const getReal = (hre: HardhatRuntimeEnvironment) => (users: MRPS<Address>[]) => async (state: State) => {
  const { ethers } = hre
  const { baseLimit, quoteOffset, shares: sharesModel } = getFairpool(state)
  const { shares, controllers, recipients, gasLimits } = getRealShareParamsFromModel(sharesModel)
  const fairpoolFactory = await ethers.getContractFactory('Fairpool')
  const owner = await ethers.getSigner(getRealFromModel('owner')(users))
  const fairpool = (await fairpoolFactory.connect(owner).deploy(
    'Test Token',
    'TEST',
    baseLimit,
    quoteOffset,
    DefaultPrecision,
    shares,
    controllers,
    recipients,
    gasLimits,
  )) as unknown as FairpoolContract
  return {
    hre,
    fairpool,
  }
}

describe.skip('Fairpool fast-check', async function () {
  festF(async function assertNoDeadlock() {
    return assertPRD(stateArb, commandsArb(usersDefault), async function (state, commands) {
      const usersMRPS = todo<MRPS<Address>[]>()
      const real = await getReal(hre)(usersMRPS)(state)
      const model = state
      await asyncModelRun(() => ({ model, real }), commands)
    })
  })

})
