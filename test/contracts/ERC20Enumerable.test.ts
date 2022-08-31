import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot } from '../support/test.helpers'
import { ERC20Enumerable, GenericERC20Enumerable } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { $zero } from '../../data/allAddresses'
import { fest } from '../../util-local/mocha'
import { TestMetronome } from '../support/Metronome'
import { assert, asyncModelRun, asyncProperty, commands, constantFrom, context, record } from 'fast-check'
import { ERC20EnumerableModel } from './ERC20Enumerable/ERC20EnumerableModel'
import { ERC20EnumerableReal, getBalancesFull } from './ERC20Enumerable/ERC20EnumerableReal'
import { ModelRunSetup } from 'fast-check/lib/types/check/model/ModelRunner'
import { uint256BN } from '../support/fast-check.helpers'
import { TransferCommand } from './ERC20Enumerable/commands/TransferCommand'

describe('ERC20Enumerable', async function () {
  let signers: SignerWithAddress[]
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let owen: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let sally: SignerWithAddress
  let ted: SignerWithAddress
  let tara: SignerWithAddress

  let token: ERC20Enumerable
  let tokenAsOwen: ERC20Enumerable
  let tokenAsSam: ERC20Enumerable
  let tokenAsBob: ERC20Enumerable
  let tokenAsSally: ERC20Enumerable

  let now: Date

  let snapshot: unknown

  // let bid: number
  // let jump: number
  // let denominator: number

  const debug = $debug(this.title)

  before(async () => {
    signers = [owner, stranger, owen, bob, sam, ted, sally, tara] = await ethers.getSigners()

    const GenericERC20EnumerableFactory = await ethers.getContractFactory('GenericERC20Enumerable')
    tokenAsOwen = (await GenericERC20EnumerableFactory.connect(owen).deploy('Generic', 'GEN', 1000000, [], [])) as unknown as GenericERC20Enumerable
    token = tokenAsOwen.connect($zero)
    tokenAsBob = tokenAsOwen.connect(bob)
    tokenAsSam = tokenAsOwen.connect(sam)
    tokenAsSally = tokenAsOwen.connect(sally)

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  fest('must work correctly', async () => {
    // const expirationDateMin = now
    // const expirationDateMax = dateAdd(now, { years: 5 })
    // const expirationDateMinPre = dateAdd(expirationDateMin, { seconds: -1 })
    // const expirationDateMaxPost = dateAdd(expirationDateMax, { seconds: +1 })
    const metronome = new TestMetronome(now)
    const getTestPair = await get_getTestPair(token)
    await assert(
      asyncProperty(commands(getCommandArbitraries(), { maxCommands: 50 }), context(), async (cmds, ctx) => {
        ctx.log('Running cmds') // doesn't output anything
        snapshot = await getSnapshot()
        try {
          await asyncModelRun(getTestPair, cmds)
        } finally {
          await revertToSnapshot([snapshot])
        }
      }),
    )
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

  function getCommandArbitraries() {
    const addressesOfSigners = signers.map(s => s.address)
    return [
      record({
        from: constantFrom(...addressesOfSigners),
        to: constantFrom(...addressesOfSigners),
        amount: uint256BN(),
      }).map((r) => new TransferCommand(
        r.from,
        r.to,
        r.amount
      )),
      // record({
      //   address: constantFrom(...addressesOfSigners),
      // }).map((r) => new DummyCommand(
      //   r.address,
      //   info
      // )),
      // record({
      //   to: constantFrom(...addressesOfSigners),
      //   amount: uint256(),
      // }).map((r) => new MintCommand(
      //   r.to,
      //   r.amount
      // )),
      // record({
      //   from: constantFrom(...addressesOfSigners),
      //   amount: uint256(),
      // }).map((r) => new BurnCommand(
      //   r.from,
      //   r.amount
      // )),
    ]
  }

})
