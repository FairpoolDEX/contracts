import { DateTime } from "luxon"
import { expect } from "../../util/expect"
import { toInteger, identity, flatten, fromPairs, zip } from "lodash"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { dateAdd, hours, MaxUint256, seconds, sum, toTokenAmount, years } from "../support/all.helpers"
import { zero, getLatestBlockTimestamp, setNextBlockTimestamp, timeTravel, getSnapshot, revertToSnapshot, expectBalances, expectBalance, $zero, logBn } from "../support/test.helpers"
import { BaseToken, QuoteToken, ShieldLoot, ShieldToken } from "../../typechain"
import { BigNumber, BigNumberish, Contract } from "ethers"
import { beforeEach } from "mocha"
import { Address } from "../../util/types"
import { deployUniswapPair, getMinimumLiquidityShare, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory, getWETH9ContractFactory, uniswapMinimumLiquidity } from "../support/Uniswap.helpers"
import $debug, { Debugger } from "debug"
import { SHIELD_ALLOCATIONS, shieldReleaseTime } from "../support/ShieldToken.helpers"

describe("ShieldLoot", async function() {
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let owen: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let bella: SignerWithAddress
  let sally: SignerWithAddress

  let shield: ShieldToken
  let shieldAsOwner: ShieldToken
  let shieldAsStranger: ShieldToken
  let shieldAsBob: ShieldToken
  let shieldAsSam: ShieldToken
  let shieldAsSally: ShieldToken

  let loot: ShieldLoot
  let lootAsOwen: ShieldLoot
  let lootAsSam: ShieldLoot
  let lootAsBob: ShieldLoot
  let lootAsSally: ShieldLoot

  let now: Date

  let snapshot: any

  const debug = $debug(this.title)

  before(async () => {
    const signers = [owner, stranger, owen, bob, sam, bella, sally] = await ethers.getSigners()

    const shieldTokenFactory = await ethers.getContractFactory("ShieldToken")
    shieldAsOwner = (await upgrades.deployProxy(shieldTokenFactory, [shieldReleaseTime])) as unknown as ShieldToken
    await shieldAsOwner.deployed()
    shield = shieldAsOwner.connect(zero)
    shieldAsStranger = shieldAsOwner.connect(stranger)
    shieldAsBob = shieldAsOwner.connect(bob)
    shieldAsSam = shieldAsOwner.connect(sam)
    shieldAsSally = shieldAsOwner.connect(sally)

    const lootFactory = await ethers.getContractFactory("ShieldLoot")
    lootAsOwen = (await lootFactory.connect(owen).deploy()) as unknown as ShieldLoot
    loot = lootAsOwen.connect(zero)
    lootAsBob = lootAsOwen.connect(bob)
    lootAsSam = lootAsOwen.connect(sam)
    lootAsSally = lootAsOwen.connect(sally)

    now = new Date(await getLatestBlockTimestamp() * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  it("must allow to claim loot for holders of ShieldToken", async () => {

  })

  it("must not allow to claim loot for non-holders of ShieldToken", async () => {

  })
})
