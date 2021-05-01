import {ethers, upgrades} from "hardhat"
import {solidity} from "ethereum-waffle"
import {utils, BigNumber} from "ethers"
import {formatUnits} from "ethers/lib/utils"
import chai from "chai"
import {ShieldToken} from "../typechain/ShieldToken"

import {ALLOCATIONS, RELEASE_TIME} from '../scripts/parameters'
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers"

chai.use(solidity)
const {expect} = chai

export const toTokenAmount = (value: string | number): BigNumber => utils.parseUnits(typeof value === "number" ? value.toString() : value, "18")


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

    let token: ShieldToken
    let nonOwnerToken: ShieldToken


    beforeEach(async () => {
        [owner, nonOwner] = await ethers.getSigners()

        const tokenFactory = await ethers.getContractFactory("ShieldToken")
        token = (await upgrades.deployProxy(tokenFactory, [RELEASE_TIME])) as unknown as ShieldToken
        await token.deployed()

        nonOwnerToken = token.connect(nonOwner)

        // add allocations
        for (const [vestingTypeIndex, allocation] of Object.entries(ALLOCATIONS)) {
            const addresses = Object.keys(allocation)
            const amounts = Object.values(allocation)

            await token.addAllocations(addresses, amounts, vestingTypeIndex)
        }
    })

    it("should assign the total supply of tokens to the owner and transfer to frozen wallets", async () => {
        const totalSupply = await token.totalSupply()
        const balance = await token.balanceOf(owner.address)
        const frozenSupply = Object.values(ALLOCATIONS)
            .map(allocation => Object.values(allocation)
                .reduce((a, b) => a + b, 0))
            .reduce((a: number, b: number) => a + b, 0)
        expect(balance.add(toTokenAmount(frozenSupply))).to.equal(totalSupply)
    })

    describe("transferMany", async () => {

        it("should transfer to many recipients", async () => {
            const wallets = (await ethers.getSigners()).slice(2)
            const amounts = wallets.map((wallet, i) => toTokenAmount(i + 1))

            await expect(() => {
                token.transferMany(wallets.map(i => i.address), amounts)
            }).to.changeTokenBalances(token, wallets, amounts)
        })

        it("should throw if wrong array length parameters", async () => {
            const recipients = [owner.address, nonOwner.address]
            const amounts = [toTokenAmount(10)]
            await expect(
                token.transferMany(recipients, amounts),
            ).to.be.revertedWith("Wrong array length")
        })

        it("should throw if amount exceeds balance ", async () => {
            const ownerBalance = await token.balanceOf(owner.address)

            const recipients = (await ethers.getSigners()).slice(2).map(i => i.address)
            const amounts = recipients.map((address, i) => ownerBalance)

            await expect(
                token.transferMany(recipients, amounts),
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        })

        it("should run only by owner", async () => {
            const amount = toTokenAmount(100)
            await token.transfer(nonOwner.address, amount)

            await expect(
                nonOwnerToken.transferMany([owner.address], [amount]),
            ).to.be.revertedWith("caller is not the owner")
        })
    })

    describe("Withdraw", async () => {

        it("should withdraw ETH", async () => {
            const amount = 1
            // send some ETH to token's address using payable addAllocations func
            await token.addAllocations([], [], "0", {value: amount, gasPrice: 0})

            await expect(
                await token.withdraw(amount),
            ).to.changeEtherBalances([owner, token], [amount, -amount])
        })

        it("should withdraw ERC20 token", async () => {
            const amount = 1000
            await token.transfer(token.address, amount)

            await expect(() => {
                token.withdrawToken(token.address, amount)
            }).to.changeTokenBalances(token, [owner, token], [amount, -amount])
        })

        it("should run only by owner", async () => {
            await expect(
                nonOwnerToken.withdraw(1),
            ).to.be.revertedWith("caller is not the owner")

            await expect(
                nonOwnerToken.withdrawToken(token.address, 1),
            ).to.be.revertedWith("caller is not the owner")
        })
    })

    describe("Pausable", async () => {

        it("should pause / unpause", async () => {
            let paused = await token.paused()
            expect(paused).to.be.equal(false)

            const amount = toTokenAmount(10)
            await token.transfer(nonOwner.address, amount)

            await token.pause(true)

            paused = await token.paused()
            expect(paused).to.be.equal(true)

            await expect(
                nonOwnerToken.transfer(owner.address, amount),
            ).to.be.revertedWith("ERC20Pausable: token transfer while paused")

            await token.pause(false)

            paused = await token.paused()
            expect(paused).to.be.equal(false)

            await expect(() => {
                nonOwnerToken.transfer(owner.address, amount)
            }).to.changeTokenBalance(token, owner, amount)
        })

        it("should pause / unpause only by owner", async () => {
            await expect(
                nonOwnerToken.pause(true),
            ).to.be.revertedWith("caller is not the owner")
        })
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
            await expect(
                token.connect(nonOwner).setReleaseTime(newReleaseTime),
            ).to.be.revertedWith("caller is not the owner")
        })

        it("shouldn't be able to change release time from past", async () => {
            const badReleaseTime = Math.floor(new Date().getTime() / 1000) - 3600
            await expect(
                token.setReleaseTime(badReleaseTime),
            ).to.be.revertedWith("Release time should be in future")
        })

        it("shouldn't be able to change release time after release", async () => {
            const newReleaseTime = Math.floor(new Date("2022.01.01 12:00:00 GMT").getTime() / 1000)
            const newBlockTimestamp = RELEASE_TIME + 3600
            await timeTravel(async () => {
                await expect(
                    token.setReleaseTime(newReleaseTime),
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

    describe("Adding allocations", async () => {

        it("should run only by owner", async () => {
            await expect(
                nonOwnerToken.addAllocations([nonOwner.address], [10], "0"),
            ).to.be.revertedWith("caller is not the owner")
        })

        it("should throw if invalid vestingType is passed", async () => {
            const invalidVestingTypeIndex = 999
            await expect(
                token.addAllocations([nonOwner.address], [10], invalidVestingTypeIndex),
            ).to.be.revertedWith("Invalid vestingTypeIndex")
        })

        it("should throw if different array lengths are passed", async () => {
            await expect(
                token.addAllocations([nonOwner.address], [10, 20], "0"),
            ).to.be.revertedWith("Array lengths must be same")

            await expect(
                token.addAllocations([nonOwner.address, owner.address], [10], "0"),
            ).to.be.revertedWith("Array lengths must be same")
        })

        it("should throw if some amount of allocations exceeds the current supply", async () => {
            const supply = await token.totalSupply()
            const amount = supply.div(18).add(1)
            await expect(
                token.addAllocations([nonOwner.address], [amount], "0"),
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        })

        it("should throw if total amount of allocations exceeds the current supply", async () => {
            const supply = await token.totalSupply()
            const addresses = (await ethers.getSigners()).slice(2).map(i => i.address)
            const amounts = addresses.map(i => supply.div(addresses.length - 1))
            await expect(
                token.addAllocations(addresses, amounts, "0"),
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        })

        it("should throw if freezing same address at second time ", async () => {
            const [vestingIndex, allocation] = Object.entries(ALLOCATIONS)[0]
            const address = Object.keys(allocation)[0]
            await expect(
                token.addAllocations([address], [100], vestingIndex),
            ).to.be.revertedWith("Wallet already frozen")
        })
    })

    describe("Vesting", async () => {

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
                        token.transferFrom(address, owner.address, toTokenAmount(amount)),
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
                    const unlockedAmount = await token.getUnlockedAmount(address)
                    expect(unlockedAmount).to.equal(0)

                    await expect(
                        token.transferFrom(address, owner.address, toTokenAmount(amount)),
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
                    const unlockedAmount = await token.getUnlockedAmount(address)
                    expect(unlockedAmount).to.equal(initialAmount)
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
                    const monthlyAmount = toTokenAmount(amount * (105556 / 10000) / 100)
                    const unlockedAmount = await token.getUnlockedAmount(address)
                    expect(unlockedAmount).to.equal(initialAmount.add(monthlyAmount))
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

        it("should run disableTransfers only by owner", async () => {
            await expect(
                nonOwnerToken.disableTransfers(defenseBlockDuration),
            ).to.be.revertedWith("caller is not the owner")
        })

        it("anti-bot defense should be off after deploy", async () => {
            const isTransferDisabled = await nonOwnerToken.isTransferDisabled()
            expect(isTransferDisabled).to.be.equal(false)
        })

        it("should burn when transfer for regular wallets if defense is on", async () => {
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
                nonOwnerToken.transfer(owner.address, tokenAmount),
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

        it("should revert when transfer for frozen wallets if defense is on", async () => {
            const frozenAMount = 100
            await token.addAllocations([nonOwner.address], [frozenAMount], "0")

            const canTransfer = await token.canTransfer(nonOwner.address, toTokenAmount(frozenAMount))
            expect(canTransfer).to.be.equal(false)

            const supply: BigNumber = await token.totalSupply()

            await token.disableTransfers(defenseBlockDuration)

            // transfers should be disabled
            expect(await nonOwnerToken.isTransferDisabled()).to.be.equal(true)

            const senderBalance: BigNumber = await token.balanceOf(nonOwner.address)
            const receiverBalance: BigNumber = await token.balanceOf(owner.address)

            // try to send tokens
            await expect(
                nonOwnerToken.transfer(owner.address, senderBalance),
            ).to.be.revertedWith("Wait for vesting day!")

            // balance of sender shouldn't change
            const newSenderBalance: BigNumber = await token.balanceOf(nonOwner.address)
            expect(newSenderBalance).to.equal(senderBalance)

            // balance of receiver should be unchanged
            const newReceiverBalance: BigNumber = await token.balanceOf(owner.address)
            expect(newReceiverBalance).to.equal(receiverBalance)

            // total supply shouldn't change
            const newSupply: BigNumber = await token.totalSupply()
            expect(newSupply).to.equal(supply)
        })

        it("should transfer after defense is over", async () => {
            await token.disableTransfers(defenseBlockDuration)

            expect(await nonOwnerToken.isTransferDisabled()).to.be.equal(true)

            // wait until defense is over
            await skipBlocks(defenseBlockDuration)

            expect(await nonOwnerToken.isTransferDisabled()).to.be.equal(false)

            await expect(
                nonOwnerToken.transfer(owner.address, tokenAmount),
            ).to.not.emit(nonOwnerToken, "TransferBurned")
        })

        it("should disable defense calling disableBurnBeforeBlockNumber method", async () => {
            await token.disableBurnBeforeBlockNumber()

            const burnBeforeBlockNumber = await token.burnBeforeBlockNumber()
            expect(burnBeforeBlockNumber).to.be.equal(0)

            const burnBeforeBlockNumberDisabled = await token.burnBeforeBlockNumberDisabled()
            expect(burnBeforeBlockNumberDisabled).to.be.equal(true)

            await expect(
                token.disableTransfers(defenseBlockDuration),
            ).to.be.revertedWith("Bot defense is disabled")
        })

        it("should run disableBurnBeforeBlockNumber only by owner", async () => {
            await expect(
                nonOwnerToken.disableBurnBeforeBlockNumber(),
            ).to.be.revertedWith("caller is not the owner")
        })
    })
})
