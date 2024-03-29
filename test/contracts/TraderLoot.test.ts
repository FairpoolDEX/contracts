import { expect } from '../../utils-local/expect'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getLatestBlockTimestamp, getSnapshot, revertToSnapshot, timeTravel } from '../support/test.helpers'
import { ColiToken, TraderLoot } from '../../typechain-types'
import { beforeEach } from 'mocha'
import $debug from 'debug'
import { releaseTimeTest } from '../support/ColiToken.helpers'
import { decodeBase64, maxClaimTimestamp, name, ownerMaxTokenId, publicMaxTokenId, style, symbol } from '../support/TraderLoot.helpers'
import { promises as fs } from 'fs'
import * as os from 'os'
import { range, toInteger } from 'lodash'
import mkdirp from 'mkdirp'
import { $zero } from '../../data/allAddresses'
import { fest } from '../../utils-local/mocha'

xdescribe('TraderLoot', async function () {
  let owner: SignerWithAddress
  let stranger: SignerWithAddress
  let bob: SignerWithAddress
  let sam: SignerWithAddress
  let bella: SignerWithAddress
  let sally: SignerWithAddress

  let shield: ColiToken
  let shieldAsOwner: ColiToken
  let shieldAsStranger: ColiToken
  let shieldAsBob: ColiToken
  let shieldAsSam: ColiToken
  let shieldAsSally: ColiToken

  let loot: TraderLoot
  let lootAsOwner: TraderLoot
  let lootAsSam: TraderLoot
  let lootAsBob: TraderLoot
  let lootAsSally: TraderLoot

  let now: Date

  let snapshot: unknown

  const debug = $debug(this.title)

  before(async () => {
    const signers = [owner, stranger, bob, sam, bella, sally] = await ethers.getSigners()

    const ColiTokenFactory = await ethers.getContractFactory('ColiToken')
    shieldAsOwner = (await upgrades.deployProxy(ColiTokenFactory, [releaseTimeTest])) as unknown as ColiToken
    await shieldAsOwner.deployed()
    shield = shieldAsOwner.connect($zero)
    shieldAsStranger = shieldAsOwner.connect(stranger)
    shieldAsBob = shieldAsOwner.connect(bob)
    shieldAsSam = shieldAsOwner.connect(sam)
    shieldAsSally = shieldAsOwner.connect(sally)

    const lootFactory = await ethers.getContractFactory('TraderLoot')
    lootAsOwner = (await lootFactory.connect(owner).deploy(name, symbol, shield.address, publicMaxTokenId, ownerMaxTokenId, maxClaimTimestamp, style/* , weapons, chests, heads, waists, feet, hands/*, necks, rings, suffixes, namePrefixes, nameSuffixes, rarityPrefixes */)) as unknown as TraderLoot
    loot = lootAsOwner.connect($zero)
    lootAsBob = lootAsOwner.connect(bob)
    lootAsSam = lootAsOwner.connect(sam)
    lootAsSally = lootAsOwner.connect(sally)

    await shield.connect(owner).transfer(bob.address, 100)

    now = new Date(await getLatestBlockTimestamp(ethers) * 1000)
  })

  beforeEach(async () => {
    snapshot = await getSnapshot()
  })

  afterEach(async () => {
    await revertToSnapshot([snapshot])
  })

  fest('must allow to claim loot for holders of ColiToken', async () => {
    await loot.connect(bob).claim(1)
    const tokenId = await loot.connect(bob).tokenOfOwnerByIndex(bob.address, 0)
    expect(tokenId).to.equal(1)
  })

  fest('must not allow to claim loot for non-holders of ColiToken', async () => {
    await expect(loot.connect(sam).claim(1)).to.be.revertedWith('Only parent token owners can claim')
    const balance = await loot.connect(sam).balanceOf(sam.address)
    expect(balance).to.equal(0)
  })

  fest('must not allow non-owner to claim multiple tokens anytime', async () => {
    await loot.connect(bob).claim(1)
    await expect(loot.connect(bob).claim(2)).to.be.revertedWith('This address already has a token')
    await timeTravel(async () => {
      await expect(loot.connect(bob).claim(3)).to.be.revertedWith('This address already has a token')
    }, maxClaimTimestamp + 1)
  })

  fest('must allow owner to claim multiple tokens anytime', async () => {
    await loot.connect(owner).claimForOwner(ownerMaxTokenId - 1)
    await loot.connect(owner).claimForOwner(ownerMaxTokenId - 2)
    await timeTravel(async () => {
      await loot.connect(owner).claimForOwner(ownerMaxTokenId - 3)
      await loot.connect(owner).claimForOwner(ownerMaxTokenId - 4)
    }, maxClaimTimestamp + 1)
  })

  fest('must not allow non-owner to claim after maxClaimTimestamp', async () => {
    await timeTravel(async () => {
      await expect(loot.connect(bob).claim(1)).to.be.revertedWith('Can\'t claim after maxClaimTimestamp')
    }, maxClaimTimestamp + 1)
  })

  fest('must not allow owner to claim public tokens before maxClaimTimestamp', async () => {
    await expect(loot.connect(owner).claim(1)).to.be.revertedWith('Owner can\'t claim')
  })

  fest('must allow owner to claim any token after maxClaimTimestamp', async () => {
    await timeTravel(async () => {
      await loot.connect(owner).claimForOwner(1)
    }, maxClaimTimestamp + 1)
  })

  fest('must generate loot with correct distribution', async function () {
    const size = process.env.LOOT_SIZE ? toInteger(process.env.LOOT_SIZE) : 25
    const from = process.env.LOOT_FROM ? toInteger(process.env.LOOT_FROM) : 1
    const to = process.env.LOOT_TO ? toInteger(process.env.LOOT_TO) : size + 1
    this.timeout(size * 1000)
    const dir = `${os.tmpdir()}/loot.${size}`
    mkdirp.sync(dir)
    const tokenIds = range(from, to)
    await loot.connect(owner).setMaxTokenId(size, size)
    await Promise.all(tokenIds.map(async (tokenId) => {
      const tokenURI = await loot.tokenURI(tokenId)
      const base64 = decodeBase64(tokenURI.replace('data:application/json;base64,', ''))
      const data = JSON.parse(base64)
      const image = decodeBase64(data.image.replace('data:image/svg+xml;base64,', ''))
      await fs.writeFile(`${dir}/${tokenId}.svg`, image)
      expect(image).to.contain('svg')
    }))
  })

  fest('must not allow to deploy with invalid ownerMaxTokenId, publicMaxTokenId', async () => {
    const lootFactory = await ethers.getContractFactory('TraderLoot')
    await expect(lootFactory.connect(owner).deploy(name, symbol, shield.address, 0, 0, maxClaimTimestamp, style)).to.be.revertedWith('ownerMaxTokenId must be greater than 0')
    await expect(lootFactory.connect(owner).deploy(name, symbol, shield.address, 100, 1, maxClaimTimestamp, style)).to.be.revertedWith('ownerMaxTokenId must be greater or equal to publicMaxTokenId')
  })
})
