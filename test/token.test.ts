import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { utils, BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import chai from "chai"
import { ShieldToken } from "../typechain/ShieldToken"

import { ALLOCATIONS, RELEASE_TIME } from '../scripts/parameters'

chai.use(solidity)
const { expect } = chai

const { hexlify, parseUnits, randomBytes } = utils

export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
export const toTokenAmount = (value: string | number): BigNumber => parseUnits(typeof value === "number" ? value.toString() : value, "18")
export const formatTokenAmount = (value: BigNumber): string => formatUnits(value, "18")
export const randomHexBytes = (n = 32): string => hexlify(randomBytes(n))

describe("ShieldToken", async () => {
  let token: ShieldToken
  beforeEach(async () => {
    const tokenFactory = await ethers.getContractFactory("ShieldToken")
    expect(RELEASE_TIME > (new Date()).getTime() / 1000).to.equal(true)
    token = (await upgrades.deployProxy(tokenFactory, [RELEASE_TIME])) as unknown as ShieldToken
    await token.deployed()
  })

  it('should have correct release time', async () => {
    const releaseTime = await token.releaseTime()
    expect(releaseTime).to.equal(RELEASE_TIME)
  })

  it("should assign the total supply of tokens to the owner", async () => {
    const [owner] = await ethers.getSigners()
    const balance = await token.balanceOf(owner.address)
    expect(balance).to.equal(await token.totalSupply())
  })

  it("should transfer tokens", async () => {
    const [owner, receiver] = await ethers.getSigners()
    await token.transfer(receiver.address, toTokenAmount("10"))
    const balance = await token.balanceOf(receiver.address)
    expect(balance).to.equal(toTokenAmount("10"))
  })

  describe("Vesting", async () => {
    beforeEach(async () => {
      Object.entries(ALLOCATIONS).forEach(async ([vestingTypeIndex, allocation]) => {
        const addresses = Object.keys(allocation)
        const amounts = Object.values(allocation)

        await token.addAllocations(addresses, amounts, vestingTypeIndex)
      })
    })

    it("should have correct balances after adding allocations", async () => {
      Object.entries(ALLOCATIONS).forEach(async ([vestingTypeIndex, allocation]) => {
        Object.entries(allocation).forEach(async ([address, amount]) => {
          // check balance
          const balance = await token.balanceOf(address)
          expect(balance).to.equal(amount)
        })
      })
    })

    it("should have scheduled frozen wallets and can't transfer money", async () => {
      const [owner] = await ethers.getSigners()
      Object.entries(ALLOCATIONS).forEach(async ([vestingTypeIndex, allocation]) => {
        Object.entries(allocation).forEach(async ([address, amount]) => {
          // check frozen wallet
          const frozenWallet = await token.frozenWallets(address)
          // frozen wallet should be scheduled!
          expect(frozenWallet[6]).to.equal(true)

          // addres should can't transfer
          const canTransfer = await token.canTransfer(address, amount)
          expect(canTransfer).to.equal(false)

          expect(async () => {
            await token.transferFrom(address, owner.address, amount)
          }).to.throw()
        })
      })
    })

    it('not frozen wallets should can transfer', async () => {
      const [owner, receiver] = await ethers.getSigners()
      const amount = toTokenAmount("10")
      await token.transfer(receiver.address, amount)
      const canTransfer = await token.canTransfer(receiver.address, amount)
      expect(canTransfer).to.equal(true)

      await token.transferFrom(receiver.address, owner.address, amount)
    })

    it("should be able to transfer money after release time", async () => {
      // skip some time...move to 1 hour after release
      const newTime = RELEASE_TIME + 3600
      await ethers.provider.send("evm_setNextBlockTimestamp", [newTime])
      // TODO
    })

  })

  // no tests needed besides the basic ones - the token simply extends well-tested ERC20 contract from OpenZeppelin library
})
