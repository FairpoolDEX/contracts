import {ethers, upgrades} from "hardhat"
import {solidity} from "ethereum-waffle"
import {utils, BigNumber} from "ethers"
import {formatUnits} from "ethers/lib/utils"
import chai from "chai"
import {ShieldToken} from "../typechain/ShieldToken"

import {ALLOCATIONS, RELEASE_TIME} from '../scripts/parameters'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

chai.use(solidity)
const {expect} = chai

const {hexlify, parseUnits, randomBytes} = utils

export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
export const toTokenAmount = (value: string | number): BigNumber => parseUnits(typeof value === "number" ? value.toString() : value, "18")
export const formatTokenAmount = (value: BigNumber): string => formatUnits(value, "18")
export const randomHexBytes = (n = 32): string => hexlify(randomBytes(n))


type timeTravelCallback = () => Promise<void>;

async function timeTravel(callback: timeTravelCallback, newBlockTimestamp: number) {
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
}

async function skipBlocks(amount: number) {
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < amount; i += 1) {
        await ethers.provider.send("evm_mine", [])
    }
    /* eslint-enable no-await-in-loop */
}

describe("ShieldToken", async () => {

    let owner: SignerWithAddress
    let nonOwner: SignerWithAddress
    let ignition: SignerWithAddress

    let token: ShieldToken
    let nonOwnerToken: ShieldToken


    beforeEach(async () => {
        [owner, nonOwner, ignition] = await ethers.getSigners()

        const tokenFactory = await ethers.getContractFactory("ShieldToken")
        token = (await upgrades.deployProxy(tokenFactory, [RELEASE_TIME, ignition.address])) as unknown as ShieldToken
        await token.deployed()

        nonOwnerToken = await token.connect(nonOwner)
    })

    it("should assign the total supply of tokens to the owner", async () => {
        const balance = await token.balanceOf(owner.address)
        expect(balance).to.equal(await token.totalSupply())
    })

    it("should fail if invalid vestingType is passed to addAllocations method", async () => {
        const invalidVestingTypeIndex = 999
        await expect(
            token.addAllocations([nonOwner.address], [toTokenAmount("10")], invalidVestingTypeIndex)
        ).to.be.revertedWith("Invalid vestingTypeIndex")
    })

    // describe("Withdraw", async () => {

    //     const ethAmount = ethers.utils.parseEther("0.1")
    //     // const tokenAmount = toTokenAmount(10)

    //     beforeEach(async () => {
    //         const [owner] = await ethers.getSigners()
    //         // send some ETH to token's address
    //         // await owner.sendTransaction({
    //         //     to: token.address,
    //         //     value: ethAmount,
    //         // })
    //     })

    //     it("should withdraw ETH", async () => {
    //         const [owner] = await ethers.getSigners()
    //         const balance = await ethers.provider.getBalance(owner.address)
    //         await token.withdraw(ethAmount)
    //         const newBalance = await ethers.provider.getBalance(owner.address)
    //         expect(newBalance).to.be.equal(balance.add(ethAmount))
    //     })

    //     it("should withdraw ERC20 token", async () => {
    //         // TODO
    //     })

    //     it("only owner can withdraw", async () => {
    //         // TODO
    //     })

    // })

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
            await timeTravel(async () => {
                await expect(
                    token.setReleaseTime(newReleaseTime)
                ).to.be.revertedWith("Can't change after release")

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
            await timeTravel(async () => {
                const months = await token.getMonths(0)
                expect(months).to.equal(1)
            }, dayAfterRelease)
        })

        it("should return 2 month after release", async () => {
            const monthAfterRelease = RELEASE_TIME + 3600 * 24 * 30
            await timeTravel(async () => {
                const months = await token.getMonths(0)
                expect(months).to.equal(2)
            }, monthAfterRelease)
        })

        it("should return 0 after release if lock period", async () => {
            // 30 days lock period
            const lockPeriod = 3600 * 24 * 30
            const dayAfterRelease = RELEASE_TIME + 3600 * 24
            await timeTravel(async () => {
                const months = await token.getMonths(lockPeriod)
                expect(months).to.equal(0)
            }, dayAfterRelease)
        })

        it("should return 1 month after release if lock period", async () => {
            // 30 days lock period
            const lockPeriod = 3600 * 24 * 30
            const dayAfterRelease = RELEASE_TIME + 3600 * 24
            await timeTravel(async () => {
                const months = await token.getMonths(lockPeriod)
                expect(months).to.equal(0)
            }, dayAfterRelease)
        })
    })

    describe("Vesting", async () => {
        beforeEach(async () => {
            for (const [vestingTypeIndex, allocation] of Object.entries(ALLOCATIONS)) {
                const addresses = Object.keys(allocation)
                const amounts = Object.values(allocation)

                await token.addAllocations(addresses, amounts, vestingTypeIndex)
            }
        })

        it("should fail if freezing same address at second time ", async () => {
            const [vestingIndex, allocation] = Object.entries(ALLOCATIONS)[0]
            const address = Object.keys(allocation)[0]
            await expect(
                token.addAllocations([address], [toTokenAmount("100")], vestingIndex)
            ).to.be.revertedWith("Wallet already frozen")

        })

        it("should have scheduled frozen wallets", async () => {
            for (const allocation of Object.values(ALLOCATIONS)) {
                for (const address of Object.keys(allocation)) {
                    // check frozen wallet existance
                    const frozenWallet = await token.frozenWallets(address)
                    expect(frozenWallet[5]).to.equal(true)
                }
            }
        })

        it("frozen wallets should have correct balances after adding allocations", async () => {
            for (const allocation of Object.values(ALLOCATIONS)) {
                for (const [address, amount] of Object.entries(allocation)) {
                    // check balance
                    const balance = await token.balanceOf(address)
                    expect(balance).to.equal(toTokenAmount(amount))
                }
            }
        })

        it("shouldn't transfer from frozen wallets", async () => {
            for (const allocation of Object.values(ALLOCATIONS)) {
                for (const [address, amount] of Object.entries(allocation)) {
                    const canTransfer = await token.canTransfer(address, toTokenAmount(amount))
                    expect(canTransfer).to.equal(false)

                    await expect(
                        token.transferFrom(address, owner.address, toTokenAmount(amount))
                    ).to.be.revertedWith("Wait for vesting day!")
                }
            }
        })

        it("should transfer tokens from non-frozen wallets", async () => {
          const amount = toTokenAmount("10")

          await token.transfer(nonOwner.address, amount)

          const canTransfer = await token.canTransfer(nonOwner.address, amount)
          expect(canTransfer).to.equal(true)

          await nonOwnerToken.transfer(owner.address, amount)
        })

        it("should transfer tokens from frozenWallet after vesting period ends", async () => {
            const fiveYearsAfterRelease = RELEASE_TIME + 3600 * 24 * 365 * 5
            await timeTravel(async () => {
                for (const allocation of Object.values(ALLOCATIONS)) {
                    for (const [address, amount] of Object.entries(allocation)) {
                        const canTransfer = await token.canTransfer(address, toTokenAmount(amount))
                        expect(canTransfer).to.equal(true)
                    }
                }
            }, fiveYearsAfterRelease)
        })

        // it("should transfer all tokens after release if initial amount is 100%", async () => {
        //     const publicAllocation = ALLOCATIONS["2"]
        //     const minuteAfterRelease = RELEASE_TIME + 60
        //     await timeTravel(async () => {
        //         for (const [address, amount] of Object.entries(publicAllocation)) {
        //             const canTransfer = await token.canTransfer(address, toTokenAmount(amount))
        //             expect(canTransfer).to.equal(true)
        //         }
        //     }, minuteAfterRelease)
        // })

        it("should not transfer before lockup period is over", async () => {
            const seedAllocation = ALLOCATIONS["0"]
            const minuteAfterRelease = RELEASE_TIME + 60
            await timeTravel(async () => {
                for (const [address, amount] of Object.entries(seedAllocation)) {
                    const transferableAmount = await token.getUnlockedAmount(address)
                    expect(transferableAmount).to.equal(0)

                    await expect(
                        token.transferFrom(address, owner.address, toTokenAmount(amount))
                    ).to.be.revertedWith("Wait for vesting day!")
                }
            }, minuteAfterRelease)
        })

        it("should transfer only initial amount after lockup period", async () => {
            const seedAllocation = ALLOCATIONS["0"]
            const afterLockupPeriod = RELEASE_TIME + 3600 * 24 * 30
            await timeTravel(async () => {
                for (const [address, amount] of Object.entries(seedAllocation)) {
                    const initialAmount = toTokenAmount(amount * 5 / 100)
                    const transferableAmount = await token.getUnlockedAmount(address)
                    expect(transferableAmount).to.equal(initialAmount)
                }
            }, afterLockupPeriod)
        })

        it("should transfer initial + monthly amounts month after lockup period", async () => {
            const seedAllocation = ALLOCATIONS["0"]
            const afterLockupPeriod = RELEASE_TIME + 3600 * 24 * 30
            const monthAfterLockupPeriod = afterLockupPeriod + 3600 * 24 * 30
            await timeTravel(async () => {
                for (const [address, amount] of Object.entries(seedAllocation)) {
                    const initialAmount = toTokenAmount(amount * 5 / 100)
                    const monthlyAmount = toTokenAmount(amount * 12 / 100)
                    const transferableAmount = await token.getUnlockedAmount(address)
                    expect(transferableAmount).to.equal(initialAmount.add(monthlyAmount))
                }
            }, monthAfterLockupPeriod)
        })
    })

    describe("Anti bot", async () => {

        let defenseBlockDuration: number
        let tokenAmount: BigNumber

        beforeEach(async () => {
            // initialize
            defenseBlockDuration = 10

            // give some tokens to nonOwner for tests
            tokenAmount = toTokenAmount("10")
            token.transfer(nonOwner.address, tokenAmount)
        })

        it("anti-bot defense should be off after deploy", async () => {
            const isTransferDisabled = await nonOwnerToken.isTransferDisabled()
            expect(isTransferDisabled).to.be.equal(false)
        })

        it("should burn if defense is on", async () => {
            const supply: BigNumber = await token.totalSupply()

            await token.disableTransfers(defenseBlockDuration)

            // transfers should be disabled
            expect(await nonOwnerToken.isTransferDisabled()).to.be.equal(true)
            // owner should transfer
            expect(await token.isTransferDisabled()).to.be.equal(false)

            const senderBalance: BigNumber = await token.balanceOf(nonOwner.address)
            const receiverBalance: BigNumber = await token.balanceOf(owner.address)

            // try to send tokens
            await expect(
                nonOwnerToken.transfer(owner.address, tokenAmount)
            ).to.emit(nonOwnerToken, "TransferBurned").withArgs(nonOwner.address, tokenAmount)

            // balance of sender should decreased
            const newSenderBalance: BigNumber = await token.balanceOf(nonOwner.address)
            expect(newSenderBalance).to.equal(senderBalance.sub(tokenAmount))

            // balance of receiver should be unchanged
            const newReceiverBalance: BigNumber = await token.balanceOf(owner.address)
            expect(newReceiverBalance).to.equal(receiverBalance)

            // total supply should decreased after burn
            const newSupply: BigNumber = await token.totalSupply()
            expect(newSupply).to.equal(supply.sub(tokenAmount))
        })

        it("shouldn't burn if defense is on for ignition wallet", async () => {
            const ignitionToken = await token.connect(ignition)
            const supply: BigNumber = await token.totalSupply()

            await token.disableTransfers(defenseBlockDuration)

            // send tokens to ignition wallet
            token.transfer(ignition.address, tokenAmount)

            const ignitionBalance: BigNumber = await token.balanceOf(ignition.address)

            expect(await ignitionToken.isTransferDisabled()).to.be.equal(true)

            await expect(
                ignitionToken.transfer(owner.address, tokenAmount)
            ).to.emit(ignitionToken, "TransferBurned").withArgs(ignition.address, 0)

            // balance of ignition shoudn't decreased
            const newIgnitionBalance: BigNumber = await token.balanceOf(ignition.address)
            expect(newIgnitionBalance).to.equal(ignitionBalance)

            // total supply should be the same
            const newSupply: BigNumber = await token.totalSupply()
            expect(newSupply).to.equal(supply)
        })

        it("should transfer after defense is off", async () => {
            await token.disableTransfers(defenseBlockDuration)

            expect(await nonOwnerToken.isTransferDisabled()).to.be.equal(true)

            // wait until defense is off
            await skipBlocks(defenseBlockDuration)

            expect(await nonOwnerToken.isTransferDisabled()).to.be.equal(false)

            await expect(
                nonOwnerToken.transfer(owner.address, tokenAmount)
            ).to.not.emit(nonOwnerToken, "TransferBurned")
        })
    })

    // TODO: test transferMany function

    // TODO: after deploy should send tokens from public vesting.
})
