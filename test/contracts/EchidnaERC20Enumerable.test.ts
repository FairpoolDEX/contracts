import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { EchidnaERC20Enumerable } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { $zero } from '../../data/allAddresses'
import { fest } from '../../util-local/mocha'
import { Address } from '../../models/Address'
import { bn } from '../../libs/bn/utils'
import { expect } from '../../util-local/expect'

describe('EchidnaERC20Enumerable', async function () {
  type Token = EchidnaERC20Enumerable

  let signers: SignerWithAddress[]
  let addresses: Address[]

  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let owen: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let sally: SignerWithAddress
  let ted: SignerWithAddress
  let tara: SignerWithAddress

  let token: Token
  let tokenAsOwner: Token
  let tokenAsSam: Token
  let tokenAsBob: Token
  let tokenAsSally: Token

  const amountPerSigner = 1000

  let now: Date

  let snapshot: unknown

  // let bid: number
  // let jump: number
  // let denominator: number

  const debug = $debug(this.title)

  before(async () => {
    signers = [owner, stranger, owen, bob, sam, ted, sally, tara] = await ethers.getSigners()
    addresses = signers.map(s => s.address)

    const EchidnaERC20EnumerableFactory = await ethers.getContractFactory('EchidnaERC20Enumerable')
    tokenAsOwner = (await EchidnaERC20EnumerableFactory.connect(owner).deploy()) as unknown as Token
    token = tokenAsOwner.connect($zero)
    tokenAsBob = tokenAsOwner.connect(bob)
    tokenAsSam = tokenAsOwner.connect(sam)
    tokenAsSally = tokenAsOwner.connect(sally)

    // const otherSigners = signers.filter(s => s !== owner)
    // await mapAsync(otherSigners, s => tokenAsOwner.transfer(s.address, amountPerSigner))

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  fest('must replicate a zero amount test', async () => {
    await expect_totalSupplyArray_eq_totalSupply(token)
    await tokenAsOwner.transfer('0x00000000000000000000000000000000DeaDBeef', bn(0))
    await expect_totalSupplyArray_eq_totalSupply(token)
  })

})

async function expect_totalSupplyArray_eq_totalSupply(token: EchidnaERC20Enumerable) {
  const totalSupply = await token.totalSupply()
  const totalSupplyArray = await token.totalSupplyArray()
  expect(totalSupply).to.equal(totalSupplyArray)
}
