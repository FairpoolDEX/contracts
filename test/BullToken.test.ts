import chai from "chai"
import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { BigNumber } from "ethers"
import { toTokenAmount, fromTokenAmount, timeTravel, skipBlocks } from "./support/helpers"
import { ShieldToken } from "../typechain/ShieldToken"
import { BullToken } from "../typechain/BullToken"

import { SHIELD_ALLOCATIONS, SHIELD_RELEASE_TIME } from "./support/ShieldToken.helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp, burnRate, claims, getClaims } from "./support/BullToken.helpers"

const claimers = Object.keys(claims)
const amounts = claimers.map((address) => claims[address])

chai.use(solidity)
const { expect } = chai

/**
 * Events
 * - User sends SHLD tokens
 * - User provides SHLD liquidity to a Uniswap V2 pool
 * - User provides SHLD liquidity to a Uniswap V3 pool
 * - Dev makes a snapshot
 * - User claims BULL tokens
 */

describe("BullToken", async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string

  let shieldTokenWithOwner: ShieldToken
  let shieldTokenWithStranger: ShieldToken

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners()

    strangerAddress = await stranger.getAddress()
    ownerAddress = await owner.getAddress()

    const shieldTokenFactory = await ethers.getContractFactory("ShieldToken")
    shieldTokenWithOwner = (await upgrades.deployProxy(shieldTokenFactory, [SHIELD_RELEASE_TIME])) as unknown as ShieldToken
    await shieldTokenWithOwner.deployed()
    shieldTokenWithStranger = shieldTokenWithOwner.connect(stranger)

    const bullTokenFactory = await ethers.getContractFactory("BullToken")
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestamp, airdropClaimDuration, airdropStageDuration])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger)

    // add allocations
    for (const [vestingTypeIndex, allocation] of Object.entries(SHIELD_ALLOCATIONS)) {
      const addresses = Object.keys(allocation)
      const amounts = Object.values(allocation)

      await shieldTokenWithOwner.addAllocations(addresses, amounts, vestingTypeIndex)
    }
  })

  it("should allow the owner to set claims", async () => {
    await bullTokenWithOwner.setClaims(claimers, amounts)
    const _claims = await getClaims(bullTokenWithOwner)
    expect(_claims).to.deep.equal(claims)
  })

  it("should allow the owner to add claims", async () => {
    const claimersToAdd = ["0x005e288D713a5fB3d7c9cf1B43810A98688C7223"]
    const amountsToAdd = [500]
    const claimsWithAdded = Object.assign({}, claims, { [claimersToAdd[0]]: amountsToAdd[0] })
    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.addClaims(claimersToAdd, amountsToAdd)
    const _claims = await getClaims(bullTokenWithOwner)
    expect(_claims).to.deep.equal(claimsWithAdded)
  })

  it("should allow the owner to clear claims", async () => {
    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.clearClaims()
    const _claims = await getClaims(bullTokenWithOwner)
    expect(_claims).to.deep.equal({})
  })

  it("should not allow non-owner to set claims", async () => {
    await expect(
      bullTokenWithStranger.setClaims(claimers, amounts),
    ).to.be.revertedWith("caller is not the owner")
  })

  it("should not allow non-owner to add claims", async () => {
    await expect(
      bullTokenWithStranger.addClaims(claimers, amounts),
    ).to.be.revertedWith("caller is not the owner")
  })

  it("should not allow non-owner to clear claims", async () => {
    await expect(
      bullTokenWithStranger.clearClaims(),
    ).to.be.revertedWith("caller is not the owner")
  })

  it("should allow any user to claim the tokens", async () => {
    const strangerAmount = 1000

    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.addClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claim()).to.be.revertedWith("Can't claim")
    expect(fromTokenAmount(await bullTokenWithStranger.balanceOf(strangerAddress))).to.equal(0)

    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      await expect(bullTokenWithStranger.claim()).to.be.revertedWith("Can't claim")
      expect(fromTokenAmount(await bullTokenWithStranger.balanceOf(strangerAddress))).to.equal(strangerAmount)
    }, airdropStartTimestamp)

    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      await bullTokenWithOwner.addClaims([strangerAddress], [strangerAmount])
      await bullTokenWithStranger.claim()
      await expect(bullTokenWithStranger.claim()).to.be.revertedWith("Can't claim")
      expect(fromTokenAmount(await bullTokenWithStranger.balanceOf(strangerAddress))).to.equal(2 * strangerAmount)
    }, airdropStartTimestamp + airdropStageDuration)
  })

  it("should not allow the user to claim BULL tokens before or after the distribution stage finishes", async () => {
    const strangerAmount = 1000

    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.addClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claim()).to.be.revertedWith("Can't claim")
    expect(fromTokenAmount(await bullTokenWithStranger.balanceOf(strangerAddress))).to.equal(0)

    await timeTravel(async () => {
      await expect(bullTokenWithStranger.claim()).to.be.revertedWith("Can't claim")
      expect(fromTokenAmount(await bullTokenWithStranger.balanceOf(strangerAddress))).to.equal(0)
    }, airdropStartTimestamp + airdropClaimDuration + 1)
  })

  it("should burn BULL token on transfer", async () => {
    const strangerAmount = 1000
    const transferAmount = 150

    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.addClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claim()).to.be.revertedWith("Can't claim")
    expect(fromTokenAmount(await bullTokenWithStranger.balanceOf(strangerAddress))).to.equal(0)

    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      await bullTokenWithStranger.transfer(ownerAddress, toTokenAmount(transferAmount))
      expect(fromTokenAmount(await bullTokenWithOwner.balanceOf(ownerAddress))).to.equal(transferAmount * burnRate)
    }, airdropStartTimestamp)
  })

  // The following tests are superseded by manual snapshotting
  // should not allow the user to claim more BULL tokens than SHLD tokens
  // should not allow the user to claim more BULL tokens than SHLD tokens after moving SHLD tokens to another address
  // should not allow the user to claim BULL tokens if he sells before the next distribution
  // should allow the user to claim BULL tokens if he doesn't sell before the next distribution
  // should allow liquidity providers on Uniswap V2 and V3 to claim BULL token

})
