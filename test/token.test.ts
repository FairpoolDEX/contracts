import {ethers, upgrades} from "hardhat"
import {solidity} from "ethereum-waffle"
import {utils, BigNumber} from "ethers"
import {formatUnits} from "ethers/lib/utils"
import chai from "chai"
import {ShieldToken} from "../typechain/ShieldToken"

import {ALLOCATIONS, RELEASE_TIME} from '../scripts/parameters'

chai.use(solidity)
const {expect} = chai

const {hexlify, parseUnits, randomBytes} = utils

export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
export const toTokenAmount = (value: string | number): BigNumber => parseUnits(typeof value === "number" ? value.toString() : value, "18")
export const formatTokenAmount = (value: BigNumber): string => formatUnits(value, "18")
export const randomHexBytes = (n = 32): string => hexlify(randomBytes(n))


async function timeTravel(callback: Function, newBlockTimestamp: number) {
    const snapshot = await ethers.provider.send('evm_snapshot', [])
    await ethers.provider.send("evm_setNextBlockTimestamp", [newBlockTimestamp])
    await callback()
    await ethers.provider.send('evm_revert', [snapshot])
}


describe("ShieldToken", async () => {
    let token: ShieldToken
    beforeEach(async () => {
        const tokenFactory = await ethers.getContractFactory("ShieldToken")
        expect(RELEASE_TIME > (new Date()).getTime() / 1000).to.equal(true)
        token = (await upgrades.deployProxy(tokenFactory, [RELEASE_TIME])) as unknown as ShieldToken
        await token.deployed()
    })

    it("should assign the total supply of tokens to the owner", async () => {
        const [owner] = await ethers.getSigners()
        const balance = await token.balanceOf(owner.address)
        expect(balance).to.equal(await token.totalSupply())
    })

    describe("Release time", async () => {

        it('should have correct release time after deploy', async () => {
            const releaseTime = await token.releaseTime()
            expect(releaseTime).to.equal(RELEASE_TIME)
        })

        it('should be able to change release time', async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            await token.setReleaseTime(newReleaseTime)

            const releaseTime = await token.releaseTime()
            expect(releaseTime).to.equal(newReleaseTime)
        })

        it('shouldn\'t be able to change release time by non owner', async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            const [owner, nonOwner] = await ethers.getSigners()
            await expect(
                token.connect(nonOwner).setReleaseTime(newReleaseTime)
            ).to.be.revertedWith("caller is not the owner")
        })

        it('shouldn\'t be able to change release time from past', async () => {
            const badReleaseTime = Math.floor(new Date().getTime() / 1000) - 3600
            await expect(
                token.setReleaseTime(badReleaseTime)
            ).to.be.revertedWith("Release time should be in future")
        })

        it('shouldn\'t be able to change release time after release', async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            const newBlockTimestamp = RELEASE_TIME + 3600
            timeTravel(async () => {
                await expect(
                    token.setReleaseTime(newReleaseTime)
                ).to.be.revertedWith("Can't change release time after release")

            }, newBlockTimestamp)
        })
    })

    describe("Vesting", async () => {
        beforeEach(async () => {
            Object.entries(ALLOCATIONS).forEach(async ([vestingTypeIndex, allocation]) => {
                const addresses = Object.keys(allocation)
                const amounts = Object.values(allocation)

                await token.addAllocations(addresses, amounts, vestingTypeIndex)
            })
        })

        it("should have scheduled frozen wallets", async () => {
            Object.values(ALLOCATIONS).forEach(async allocation => {
                Object.entries(allocation).forEach(async ([address, amount]) => {
                    // check frozen wallet existance
                    const frozenWallet = await token.frozenWallets(address)
                    expect(frozenWallet[5]).to.equal(true)
                })
            })
        })

        it("frozen wallets should have correct balances after adding allocations", async () => {
            Object.values(ALLOCATIONS).forEach(async allocation => {
                Object.entries(allocation).forEach(async ([address, amount]) => {
                    // check balance
                    const balance = await token.balanceOf(address)
                    expect(balance).to.equal(amount)
                })
            })
        })

        it("frozen wallets should can't transfer money", async () => {
            const [owner] = await ethers.getSigners()
            Object.values(ALLOCATIONS).forEach(async allocation => {
                Object.entries(allocation).forEach(async ([address, amount]) => {
                    const canTransfer = await token.canTransfer(address, amount)
                    expect(canTransfer).to.equal(false)

                    await expect(
                        token.transferFrom(address, owner.address, amount)
                    ).to.be.revertedWith("Wait for vesting day!")
                })
            })
        })

        // it('not frozen wallets should can transfer', async () => {
        //   const [owner, receiver] = await ethers.getSigners()
        //   const amount = toTokenAmount("10")

        //   await token.transfer(receiver.address, amount)

        //   const canTransfer = await token.canTransfer(receiver.address, amount)
        //   expect(canTransfer).to.equal(true)

        //   const receiverToken = await token.connect(receiver)
        //   await token.approve(receiver.address, amount)
        //   // await token.transferFrom(receiver.address, owner.address, amount)
        // })

        it("should be able to transfer money after lock period time", async () => {
            const [owner] = await ethers.getSigners()
            const FiveYearsAfterRelease = RELEASE_TIME + 3600 * 24 * 365 * 5
            timeTravel(async () => {
                Object.values(ALLOCATIONS).forEach(async allocation => {
                    Object.entries(allocation).forEach(async ([address, amount]) => {

                        const canTransfer = await token.canTransfer(address, amount)
                        expect(canTransfer).to.equal(true)

                        await token.transferFrom(address, owner.address, amount)
                    })
                })
            }, FiveYearsAfterRelease)
        })

    })
})
