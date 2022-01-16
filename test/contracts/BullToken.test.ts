import { expect } from '../../util/expect'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { toTokenAmount } from '../support/all.helpers'
import { timeTravel } from '../support/test.helpers'
import { BullToken, ColiToken } from '../../typechain-types'

import { allocationsForTest, releaseTimeTest } from '../support/ColiToken.helpers'
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestampForTest, burnRateDenominator, burnRateNumerator, claims, getClaims } from '../support/BullToken.helpers'
import { fest } from '../../util/mocha'

const claimers = Object.keys(claims)
const amounts = claimers.map((address) => claims[address])

/**
 * Events
 * - User sends SHLD tokens
 * - User provides SHLD liquidity to a Uniswap V2 pool
 * - User provides SHLD liquidity to a Uniswap V3 pool
 * - Dev makes a snapshot
 * - User claims BULL tokens
 */

describe('BullToken', async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string

  let coliTokenWithOwner: ColiToken
  let coliTokenWithStranger: ColiToken

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  const strangerAmount = toTokenAmount('1000')

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners()

    strangerAddress = await stranger.getAddress()
    ownerAddress = await owner.getAddress()

    const coliTokenFactory = await ethers.getContractFactory('ColiToken')
    coliTokenWithOwner = (await upgrades.deployProxy(coliTokenFactory, [releaseTimeTest])) as unknown as ColiToken
    await coliTokenWithOwner.deployed()
    coliTokenWithStranger = coliTokenWithOwner.connect(stranger)

    const bullTokenFactory = await ethers.getContractFactory('BullToken')
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestampForTest, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger)

    // add allocations
    for (const [vestingTypeIndex, allocation] of Object.entries(allocationsForTest)) {
      const addresses = Object.keys(allocation)
      const amounts = Object.values(allocation)

      await coliTokenWithOwner.addAllocations(addresses, amounts, vestingTypeIndex)
    }
  })

  fest('should allow the owner to set claims', async () => {
    await bullTokenWithOwner.setClaims(claimers, amounts)
    const _claims = await getClaims(bullTokenWithOwner, claimers)
    expect(_claims).to.deep.equal(claims)
  })

  fest('should not allow non-owner to set claims', async () => {
    await expect(
      bullTokenWithStranger.setClaims(claimers, amounts),
    ).to.be.revertedWith('caller is not the owner')
  })

  fest('should allow any user to claim the tokens for his own address', async () => {
    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claim()).to.be.revertedWith('Can\'t claim')
    expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(0)

    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      await expect(bullTokenWithStranger.claim()).to.be.revertedWith('Can\'t claim')
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount)
    }, airdropStartTimestampForTest)

    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
      await bullTokenWithStranger.claim()
      await expect(bullTokenWithStranger.claim()).to.be.revertedWith('Can\'t claim')
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount.mul(2))
    }, airdropStartTimestampForTest + airdropStageDuration)
  })

  fest('should allow any user to claim tokens for other addresses', async () => {
    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claimMany([strangerAddress])).to.be.revertedWith('Can\'t claim')
    expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(0)

    await timeTravel(async () => {
      await bullTokenWithStranger.claimMany([strangerAddress])
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount)
    }, airdropStartTimestampForTest)

    await timeTravel(async () => {
      await bullTokenWithStranger.claimMany([strangerAddress])
      await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
      await bullTokenWithStranger.claimMany([strangerAddress])
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount.mul(2))
    }, airdropStartTimestampForTest + airdropStageDuration)
  })

  fest('should not allow the user to claim BULL tokens before or after the distribution stage finishes', async () => {
    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claim()).to.be.revertedWith('Can\'t claim')
    await expect(bullTokenWithStranger.claimMany([strangerAddress])).to.be.revertedWith('Can\'t claim')
    expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(0)

    await timeTravel(async () => {
      await expect(bullTokenWithStranger.claim()).to.be.revertedWith('Can\'t claim')
      await expect(bullTokenWithStranger.claimMany([strangerAddress])).to.be.revertedWith('Can\'t claim')
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(0)
    }, airdropStartTimestampForTest + airdropClaimDuration + 1)
  })

  fest('should burn BULL token on transfer', async () => {
    const sentAmount = toTokenAmount('150')
    const recvAmount = sentAmount.mul(burnRateNumerator).div(burnRateDenominator)

    await bullTokenWithOwner.setClaims(claimers, amounts)
    await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
    await expect(bullTokenWithStranger.claim()).to.be.revertedWith('Can\'t claim')
    expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(0)

    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      await bullTokenWithStranger.transfer(ownerAddress, sentAmount)
      expect(await bullTokenWithOwner.balanceOf(strangerAddress)).to.equal(strangerAmount.sub(sentAmount))
      expect(await bullTokenWithOwner.balanceOf(ownerAddress)).to.equal(recvAmount)
    }, airdropStartTimestampForTest)
  })

  // fest("should allow the owner to rollback BULL token balances", async () => {
  //   const sentAmount = toTokenAmount("150")
  //   const recvAmount = sentAmount.mul(burnRateNumerator).div(burnRateDenominator)
  //   const feeAmount = sentAmount.sub(recvAmount)
  //
  //   await bullTokenWithOwner.setClaims(claimers, amounts)
  //   await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
  //
  //   await timeTravel(async () => {
  //     const ownerAmount1 = await bullTokenWithOwner.balanceOf(ownerAddress)
  //     await bullTokenWithStranger.claim()
  //     await bullTokenWithStranger.transfer(ownerAddress, sentAmount)
  //     const ownerAmount2 = await bullTokenWithOwner.balanceOf(ownerAddress)
  //     expect(ownerAmount2).to.equal(ownerAmount1.add(recvAmount))
  //     const burnAddresses = [ownerAddress, "0x0000000000000000000000000000000000000000"]
  //     const mintAddresses = [strangerAddress, strangerAddress]
  //     const amounts = [recvAmount, feeAmount]
  //     await bullTokenWithOwner.rollbackMany(burnAddresses, mintAddresses, amounts)
  //     expect(await bullTokenWithOwner.balanceOf(ownerAddress)).to.equal(0)
  //     expect(await bullTokenWithOwner.balanceOf(strangerAddress)).to.equal(strangerAmount)
  //   }, airdropStartTimestamp)
  // })
  //
  // fest("should not allow the non-owner to rollback BULL token balances", async () => {
  //   await timeTravel(async () => {
  //     expect(bullTokenWithStranger.rollbackMany([ownerAddress], [strangerAddress], [toTokenAmount("100")])).to.be.revertedWith("caller is not the owner")
  //   }, airdropStartTimestamp)
  // })
  //
  // fest("should not allow the owner to rollback BULL token balances if rollback is disabled", async () => {
  //   await bullTokenWithOwner.setClaims([strangerAddress], [strangerAmount])
  //
  //   await timeTravel(async () => {
  //     await bullTokenWithStranger.claim()
  //
  //     await bullTokenWithOwner.rollbackMany([strangerAddress], [ownerAddress], [toTokenAmount("100")])
  //     await bullTokenWithOwner.finishRollbackMany()
  //     await expect(bullTokenWithOwner.rollbackMany([strangerAddress], [ownerAddress], [toTokenAmount("100")])).to.be.revertedWith("rollbackMany is disabled")
  //   }, airdropStartTimestamp)
  // })

  // The following tests are superseded by manual snapshotting
  // should not allow the user to claim more BULL tokens than SHLD tokens
  // should not allow the user to claim more BULL tokens than SHLD tokens after moving SHLD tokens to another address
  // should not allow the user to claim BULL tokens if he sells before the next distribution
  // should allow the user to claim BULL tokens if he doesn't sell before the next distribution
  // should allow liquidity providers on Uniswap V2 and V3 to claim BULL token

})
