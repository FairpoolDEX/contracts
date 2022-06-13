import { ethers, upgrades } from 'hardhat'
import { GenericTokenWithVesting } from '../../typechain-types'

import { releaseTimeTest } from '../support/ColiToken.helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { addVestingTypes } from '../support/Vesting.helpers'
import { maxSupplyTokenAmount, name, symbol } from '../../test/support/MarsToken.helpers'
import MarsTokenVestingTypes, { dailyShareDuration } from '../../tasks/arguments/MarsToken.vestingTypes'
import { fest } from '../../util/mocha'
import { months } from '../../util/time'
import { expect } from '../../util/expect'

describe('MarsToken', async () => {

  let owner: SignerWithAddress
  let nonOwner: SignerWithAddress

  let token: GenericTokenWithVesting
  let nonOwnerToken: GenericTokenWithVesting

  beforeEach(async () => {
    [owner, nonOwner] = await ethers.getSigners()

    const tokenFactory = await ethers.getContractFactory('GenericTokenWithVesting')
    token = (await upgrades.deployProxy(tokenFactory, [name, symbol, maxSupplyTokenAmount, releaseTimeTest])) as unknown as GenericTokenWithVesting
    await token.deployed()

    nonOwnerToken = token.connect(nonOwner)

    await addVestingTypes(token, MarsTokenVestingTypes)
  })

  fest(dailyShareDuration.name, async () => {
    const vesting36months = dailyShareDuration(36 * months)
    expect(vesting36months.numerator).to.equal(925)
  })

})
