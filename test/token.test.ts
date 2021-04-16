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
    // save snapshot to rollback after calling callback
    const snapshot = await ethers.provider.send('evm_snapshot', [])
    // set new block timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [newBlockTimestamp])
    // mine new block to really shift time
    await ethers.provider.send("evm_mine", [])
    await callback()
    // revert snapshot and come back in time to start point
    await ethers.provider.send('evm_revert', [snapshot])
    // mine new block to really shift time
    await ethers.provider.send("evm_mine", [])
}


describe("ShieldToken", async () => {
    let token: ShieldToken
    beforeEach(async () => {
        const tokenFactory = await ethers.getContractFactory("ShieldToken")
        // expect(RELEASE_TIME > (new Date()).getTime() / 1000).to.equal(true, 'invalid release time')
        token = (await upgrades.deployProxy(tokenFactory, [RELEASE_TIME])) as unknown as ShieldToken
        await token.deployed()
    })

    it("should assign the total supply of tokens to the owner", async () => {
        const [owner] = await ethers.getSigners()
        const balance = await token.balanceOf(owner.address)
        expect(balance).to.equal(await token.totalSupply())
    })

    it("should fall if invalid vestingType passed to addAllocations method", async () => {
        const [owner, addr1] = await ethers.getSigners()
        const invalidVestingTypeIndex = 999
        await expect(
            token.addAllocations([addr1.address], [toTokenAmount("10")], invalidVestingTypeIndex)
        ).to.be.revertedWith("Invalid vestingTypeIndex")
    })

    describe("Release time", async () => {

        it("should have correct release time after deploy", async () => {
            const releaseTime = await token.releaseTime()
            expect(releaseTime).to.equal(RELEASE_TIME)
        })

        it("should be able to change release time", async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            await token.setReleaseTime(newReleaseTime)

            const releaseTime = await token.releaseTime()
            expect(releaseTime).to.equal(newReleaseTime)
        })

        it("shouldn't be able to change release time by non owner", async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            const [owner, nonOwner] = await ethers.getSigners()
            await expect(
                token.connect(nonOwner).setReleaseTime(newReleaseTime)
            ).to.be.revertedWith("caller is not the owner")
        })

        it("shouldn't be able to change release time from past", async () => {
            const badReleaseTime = Math.floor(new Date().getTime() / 1000) - 3600
            await expect(
                token.setReleaseTime(badReleaseTime)
            ).to.be.revertedWith("Release time should be in future")
        })

        it("shouldn't be able to change release time after release", async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            const newBlockTimestamp = RELEASE_TIME + 3600
            timeTravel(async () => {
                await expect(
                    token.setReleaseTime(newReleaseTime)
                ).to.be.revertedWith("Can't change release time after release")

            }, newBlockTimestamp)
        })
    })

    describe("getMonths function", async () => {
        it("should return 0 before release", async () => {
            const months = await token.getMonths(0)
            expect(months).to.equal(0)
        })

        it("should return 1 day after release", async () => {
            const dayAfterRelease = RELEASE_TIME + 3600 * 24
            timeTravel(async () => {
                const months = await token.getMonths(0)
                expect(months).to.equal(1)
            }, dayAfterRelease)
        })

        it("should return 2 month after release", async () => {
            const monthAfterRelease = RELEASE_TIME + 3600 * 24 * 30
            timeTravel(async () => {
                const months = await token.getMonths(0)
                expect(months).to.equal(2)
            }, monthAfterRelease)
        })

        it("should return 0 after release if lock period", async () => {
            // 30 days lock period
            const lockPeriod = 3600 * 24 * 30
            const dayAfterRelease = RELEASE_TIME + 3600 * 24
            timeTravel(async () => {
                const months = await token.getMonths(lockPeriod)
                expect(months).to.equal(0)
            }, dayAfterRelease)
        })

        it("should return 1 month after release if lock period", async () => {
            // 30 days lock period
            const lockPeriod = 3600 * 24 * 30
            const dayAfterRelease = RELEASE_TIME + 3600 * 24
            timeTravel(async () => {
                const months = await token.getMonths(lockPeriod)
                expect(months).to.equal(0)
            }, dayAfterRelease)
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

        it("shouldn't transfer from frozen wallets", async () => {
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

        it("should transfer tokens from not frozen wallets", async () => {
          const [owner, receiver] = await ethers.getSigners()
          const amount = toTokenAmount("10")

          await token.transfer(receiver.address, amount)

          const canTransfer = await token.canTransfer(receiver.address, amount)
          expect(canTransfer).to.equal(true)

          const receiverToken = await token.connect(receiver)
          await receiverToken.transfer(owner.address, amount)
        })

        it("should transfer tokens from frozenWallet after westing period ends", async () => {
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

        // it("should transfer all tokens after release if initial amount is 100", async () => {
        //     const publicAllocation = ALLOCATIONS["2"]
        //     const minuteAfterRelease = RELEASE_TIME + 60
        //     timeTravel(async () => {
        //         Object.entries(publicAllocation).forEach(async ([address, amount]) => {
        //             const transferableAmount = await token.getTransferableAmount(address)
        //             console.log(transferableAmount + ', ' + amount)
        //             // expect(1).to.equal(1)
        //             const canTransfer = await token.canTransfer(address, amount)
        //             expect(canTransfer).to.equal(true)
        //         })
        //     }, minuteAfterRelease)
        // })
    })
})
