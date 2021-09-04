import { expect } from "../../util/expect"
import { ethers, upgrades } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot, zero } from "../support/test.helpers"
import { ShieldToken, TraderLoot } from "../../typechain"
import { beforeEach } from "mocha"
import $debug from "debug"
import { shieldReleaseTime } from "../support/ShieldToken.helpers"
import { chestArmor, decodeBase64, maxClaimTimestamp, maxTokenId, name, style, symbol, weapons } from "../support/TraderLoot.helpers"
import { promises as fs } from "fs"
import * as os from "os"

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

  let loot: TraderLoot
  let lootAsOwen: TraderLoot
  let lootAsSam: TraderLoot
  let lootAsBob: TraderLoot
  let lootAsSally: TraderLoot

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

    const lootFactory = await ethers.getContractFactory("TraderLoot")
    lootAsOwen = (await lootFactory.connect(owen).deploy(name, symbol, shield.address, maxTokenId, maxClaimTimestamp, style, weapons, chestArmor)) as unknown as TraderLoot
    loot = lootAsOwen.connect(zero)
    lootAsBob = lootAsOwen.connect(bob)
    lootAsSam = lootAsOwen.connect(sam)
    lootAsSally = lootAsOwen.connect(sally)

    await shield.connect(owner).transfer(bob.address, 100)

    now = new Date(await getLatestBlockTimestamp() * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  it("must allow to claim loot for holders of ShieldToken", async () => {
    const tokenIdExpected = 1
    await loot.connect(bob).claim(tokenIdExpected)
    const tokenIdActual = await loot.connect(bob).tokenOfOwnerByIndex(bob.address, 0)
    expect(tokenIdActual).to.equal(tokenIdExpected)
  })

  it("must not allow to claim loot for non-holders of ShieldToken", async () => {
    const tokenIdExpected = 1
    await expect(loot.connect(sam).claim(tokenIdExpected)).to.be.revertedWith("Only parent token owners can claim")
    const balance = await loot.connect(sam).balanceOf(sam.address)
    expect(balance).to.equal(0)
  })

  it("must not allow non-owner to claim multiple tokens", async () => {

  })

  it("must not allow non-owner to claim after maxClaimTimestamp", async () => {

  })

  it("must not allow owner to claim public tokens", async () => {

  })

  it("must allow owner to claim multiple tokens", async () => {

  })

  it("must allow owner to claim any token after maxClaimTimestamp", async () => {

  })

  it("must generate loot with correct distribution", async () => {
    const tokenURI = await loot.tokenURI(1)
    const data = JSON.parse(decodeBase64(tokenURI.replace("data:application/json;base64,", "")))
    const image = decodeBase64(data.image.replace("data:image/svg+xml;base64,", ""))
    expect(image).to.contain("Dragon Roar")
    await fs.writeFile(`${os.tmpdir()}/loot.svg`, image)
  })
})
