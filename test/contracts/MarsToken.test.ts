import { ethers, upgrades } from 'hardhat'
import { GenericTokenWithVesting } from '../../typechain-types'

import { releaseTimeTest } from '../support/ColiToken.helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { addVestingTypes, dayInSeconds, monthInSeconds } from '../support/Vesting.helpers'
import { allocationsForTest, maxSupplyTokenAmount, name, symbol, vestingTypesForTest } from '../../test/support/MarsToken.helpers'
import { dailyShareDuration } from '../../tasks/arguments/MarsToken.vestingTypes'
import { fest } from '../../util-local/mocha'
import { months } from '../../util-local/time'
import { expect } from '../../util-local/expect'
import { addVestedAllocations } from '../support/Allocation.helpers'
import { sumBNs } from '../../libs/bn/utils'
import { timeTravel } from '../support/test.helpers'
import { ensure } from '../../util/ensure'
import { toSeconds } from '../../models/Duration'
import { toTokenAmount } from '../support/all.helpers'
import { RunnableContext } from '../../util-local/context/getRunnableContext'
import { getTestRunnableContext } from '../support/context'
import { zero } from '../../libs/bn/constants'

describe('MarsToken', async () => {
  let context: RunnableContext

  let owner: SignerWithAddress
  let nonOwner: SignerWithAddress

  let token: GenericTokenWithVesting
  let nonOwnerToken: GenericTokenWithVesting

  beforeEach(async () => {
    [owner, nonOwner] = await ethers.getSigners()

    context = await getTestRunnableContext({})

    const tokenFactory = await ethers.getContractFactory('GenericTokenWithVesting')
    token = (await upgrades.deployProxy(tokenFactory, [name, symbol, maxSupplyTokenAmount, releaseTimeTest])) as unknown as GenericTokenWithVesting
    await token.deployed()

    nonOwnerToken = token.connect(nonOwner)

    await addVestingTypes(context, token, vestingTypesForTest)
  })

  fest(dailyShareDuration.name, async () => {
    const vesting36months = dailyShareDuration(36 * months)
    expect(vesting36months.numerator).to.equal(925)
  })

  fest('Team vesting must be correct', async () => {
    await addVestedAllocations(context, token, vestingTypesForTest, allocationsForTest)
    const vesting = ensure(vestingTypesForTest.find(t => t.name === 'Team'))
    const allocation = ensure(allocationsForTest.find(a => a.vesting === vesting.name))
    const cliff = toSeconds(vesting.cliff)
    const { address, amount } = allocation
    const initialAmount = toTokenAmount(0)
    const dailyAmount = toTokenAmount(75480) //  toTokenAmount(74384.68551)
    const monthlyAmount = toTokenAmount(0)
    const expectations = [
      {
        name: 'releaseTimeTest - 1',
        timestamp: releaseTimeTest - 1,
        amount: zero,
      },
      {
        name: 'releaseTimeTest',
        timestamp: releaseTimeTest,
        amount: zero,
      },
      {
        name: 'releaseTimeTest + cliff',
        timestamp: releaseTimeTest + cliff,
        amount: sumBNs([
          initialAmount,
        ]),
      },
      {
        name: 'releaseTimeTest + cliff + 1',
        timestamp: releaseTimeTest + cliff + 1,
        amount: sumBNs([
          initialAmount,
        ]),
      },
      {
        name: 'releaseTimeTest + cliff + dayInSeconds',
        timestamp: releaseTimeTest + cliff + dayInSeconds,
        amount: sumBNs([
          initialAmount,
          dailyAmount,
        ]),
      },
      {
        name: 'releaseTimeTest + cliff + dayInSeconds + monthInSeconds',
        timestamp: releaseTimeTest + cliff + dayInSeconds + monthInSeconds,
        amount: sumBNs([
          initialAmount,
          dailyAmount,
          monthlyAmount,
          dailyAmount.mul(30),
        ]),
      },
      {
        name: 'releaseTimeTest + cliff + dayInSeconds + monthInSeconds',
        timestamp: releaseTimeTest + cliff + dayInSeconds * 5 + monthInSeconds * 3,
        amount: sumBNs([
          initialAmount,
          dailyAmount.mul(5),
          monthlyAmount.mul(3),
          dailyAmount.mul(30).mul(3),
        ]),
      },
    ]
    // NOTE: Using a for loop because timeTravel can't be run in parallel
    for (const expectation of expectations) {
      const { name, timestamp, amount } = expectation
      // console.log('scenario', name)
      await timeTravel(async () => {
        expect(await token.getUnlockedAmount(address), name).to.equal(amount)
      }, timestamp)
    }
  })

})
