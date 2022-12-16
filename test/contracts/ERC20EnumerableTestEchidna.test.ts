import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { ERC20EnumerableTestEchidna } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { $zero } from '../../data/allAddresses'
import { Address } from '../../models/Address'
import { expect } from '../../util-local/expect'

describe('ERC20EnumerableTestEchidna', async function () {
  type Token = ERC20EnumerableTestEchidna

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

    const ERC20EnumerableTestEchidnaFactory = await ethers.getContractFactory('ERC20EnumerableTestEchidna')
    tokenAsOwner = (await ERC20EnumerableTestEchidnaFactory.connect(owner).deploy()) as unknown as Token
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

  // fest('must replicate a zero amount test', async () => {
  //   await expect_totalSupplyArray_eq_totalSupply(token)
  //   await tokenAsOwner.transfer('0x00000000000000000000000000000000DeaDBeef', bn(0))
  //   await expect_totalSupplyArray_eq_totalSupply(token)
  // })

})

async function expect_totalSupplyArray_eq_totalSupply(token: ERC20EnumerableTestEchidna) {
  const totalSupply = await token.totalSupply()
  const totalSupplyArray = await token.totalSupplyArray()
  expect(totalSupply).to.equal(totalSupplyArray)
}
