import { expect } from "../../util/expect"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot, setNextBlockTimestamp, timeTravel, zero } from "../support/test.helpers"
import { GenericToken, ShieldToken, TraderLoot, WETH9 } from "../../typechain"
import { beforeEach } from "mocha"
import $debug from "debug"
import { shieldReleaseTime } from "../support/ShieldToken.helpers"
import { chests, decodeBase64, maxClaimTimestamp, ownerMaxTokenId, name, style, symbol, weapons, publicMaxTokenId, heads, waists, feet, hands, necks, rings, suffixes, namePrefixes, nameSuffixes, rarityPrefixes } from "../support/TraderLoot.helpers"
import { promises as fs } from "fs"
import * as os from "os"
import { range, toInteger } from "lodash"
import mkdirp from "mkdirp"
import { getWETH9ContractFactory } from "../support/Uniswap.helpers"

describe("GenericToken", async function() {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let bella: SignerWithAddress
  let sally: SignerWithAddress

  let generic: GenericToken

  let now: Date

  let snapshot: any

  const debug = $debug(this.title)

  before(async () => {
    const signers = [owner, bob, sam, bella, sally] = await ethers.getSigners()


    const genericFactory = await ethers.getContractFactory("GenericToken")
    generic = await genericFactory.deploy("Generic", "GEN", 1000000, [], []) as GenericToken

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  it("must allow to transfer", async () => {
    const balanceExpected = 100
    await generic.connect(owner).transfer(bob.address, balanceExpected)
    const balanceActual = await generic.balanceOf(bob.address)
    expect(balanceActual).to.equal(balanceExpected)
  })
})
