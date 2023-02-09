import { expect } from '../../utils-local/expect'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { GenericToken } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { fest } from '../../utils-local/mocha'

describe('GenericToken', async function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let bella: SignerWithAddress
  let sally: SignerWithAddress

  let token: GenericToken

  let now: Date

  let snapshot: unknown

  const debug = $debug(this.title)

  before(async () => {
    const signers = [owner, bob, sam, bella, sally] = await ethers.getSigners()

    const factory = await ethers.getContractFactory('GenericToken')
    token = await factory.deploy('Generic', 'GEN', [owner.address], [1000000]) as GenericToken

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  fest('must allow to transfer', async () => {
    const balanceExpected = 100
    await token.connect(owner).transfer(bob.address, balanceExpected)
    const balanceActual = await token.balanceOf(bob.address)
    expect(balanceActual).to.equal(balanceExpected)
  })
})
