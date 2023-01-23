import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { ERC20Enumerable, GenericERC20Enumerable } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { $zero } from '../../data/allAddresses'
import { fest } from '../../utils-local/mocha'
import { asyncModelRun, record } from 'fast-check'
import { ERC20EnumerableModel } from './ERC20Enumerable/ERC20EnumerableModel'
import { ERC20EnumerableReal, getBalancesFull, getHolders } from './ERC20Enumerable/ERC20EnumerableReal'
import { ModelRunSetup } from 'fast-check/lib/types/check/model/ModelRunner'
import { TransferCommand } from './ERC20Enumerable/commands/TransferCommand'
import { amountBN, uint256BN } from '../support/fast-check/arbitraries/AmountBN'
import { addressFrom } from '../support/fast-check/arbitraries/Address'
import { Address } from '../../models/Address'
import { bn } from '../../libs/bn/utils'
import { expect } from '../../utils-local/expect'
import { mapAsync } from 'libs/utils/promise'

describe('ERC20Enumerable', async function () {
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

  let token: ERC20Enumerable
  let tokenAsOwner: ERC20Enumerable
  let tokenAsSam: ERC20Enumerable
  let tokenAsBob: ERC20Enumerable
  let tokenAsSally: ERC20Enumerable

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

    const GenericERC20EnumerableFactory = await ethers.getContractFactory('GenericERC20Enumerable')
    tokenAsOwner = (await GenericERC20EnumerableFactory.connect(owner).deploy('Generic', 'GEN', 1000000, [], [])) as unknown as GenericERC20Enumerable
    token = tokenAsOwner.connect($zero)
    tokenAsBob = tokenAsOwner.connect(bob)
    tokenAsSam = tokenAsOwner.connect(sam)
    tokenAsSally = tokenAsOwner.connect(sally)

    const otherSigners = signers.filter(s => s !== owner)
    await mapAsync(otherSigners, s => tokenAsOwner.transfer(s.address, amountPerSigner))

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  fest('must add a new address to holders', async () => {
    const newAddress = '0x2A20380DcA5bC24D052acfbf79ba23e988ad0050'
    const commands = [
      new TransferCommand(owner.address, newAddress, bn(10), ethers),
    ]
    const getTestPair = await get_getTestPair(token)
    await asyncModelRun(getTestPair, commands)
    const holders = await getHolders(token)
    expect(holders).to.contain(newAddress)
  })

  fest('must remove address from holders after transferring full balance', async () => {
    const strangerBalanceOf = await token.balanceOf(stranger.address)
    const commands = [
      new TransferCommand(stranger.address, owner.address, strangerBalanceOf, ethers),
    ]
    const getTestPair = await get_getTestPair(token)
    await asyncModelRun(getTestPair, commands)
    const holders = await getHolders(token)
    expect(holders).not.to.contain(stranger.address)
  })

  fest('must not remove address from holders after transferring non-full balance', async () => {
    const strangerBalanceOf = await token.balanceOf(stranger.address)
    const amount = bn(1)
    expect(strangerBalanceOf).to.be.greaterThan(amount)
    const commands = [
      new TransferCommand(stranger.address, owner.address, amount, ethers),
    ]
    const getTestPair = await get_getTestPair(token)
    await asyncModelRun(getTestPair, commands)
    const holders = await getHolders(token)
    expect(holders).to.contain(stranger.address)
  })

  async function get_getTestPair(token: ERC20Enumerable): Promise<ModelRunSetup<ERC20EnumerableModel, ERC20EnumerableReal>> {
    const address = token.address
    const balances = await getBalancesFull(token)
    return function getTestPair() {
      return {
        model: {
          address,
          balances,
        },
        real: token,
      }
    }
  }

  function getFullCommandArbitraries() {
    return [
      record({
        from: addressFrom(addresses),
        to: addressFrom(addresses),
        amount: uint256BN(),
      }).map((r) => new TransferCommand(
        r.from,
        r.to,
        r.amount,
        ethers
      )),
    ]
  }

  function getWorkingCommandArbitraries() {
    return [
      record({
        from: addressFrom(addresses),
        to: addressFrom(addresses),
        amount: amountBN(amountPerSigner),
      }).map((r) => new TransferCommand(
        r.from,
        r.to,
        r.amount,
        ethers
      )),
    ]
  }

})
