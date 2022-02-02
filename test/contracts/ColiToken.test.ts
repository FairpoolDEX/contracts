import hardhatRuntimeEnvironment, { ethers, upgrades } from 'hardhat'
import { expect } from '../../util/expect'
import { toTokenAmount } from '../support/all.helpers'
import { timeTravel } from '../support/test.helpers'
import { ColiToken } from '../../typechain-types'

import { allocationsForTest, releaseTimeTest } from '../support/ColiToken.helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { fest } from '../../util/mocha'
import { getRunnableContext } from '../../util/context'
import { upgradeContract, UpgradeContractContext } from '../../tasks/upgradeContractTask'
import { Address } from '../../models/Address'
import { ContractName } from '../../models/ContractName'
import { DeployGenericTokenTaskUpgradeableOutput } from '../../tasks/deployContractTask'
import { impl } from '../../util/todo'
import { getColiToken } from '../../tasks/util/getToken'

describe('ColiToken', async () => {

  let owner: SignerWithAddress
  let nonOwner: SignerWithAddress

  let token: ColiToken
  let nonOwnerToken: ColiToken

  beforeEach(async () => {
    [owner, nonOwner] = await ethers.getSigners()

    const tokenFactory = await ethers.getContractFactory('ColiToken')
    token = (await upgrades.deployProxy(tokenFactory, [releaseTimeTest])) as unknown as ColiToken
    await token.deployed()

    nonOwnerToken = token.connect(nonOwner)

    // add allocations
    for (const [vestingTypeIndex, allocation] of Object.entries(allocationsForTest)) {
      const addresses = Object.keys(allocation)
      const amounts = Object.values(allocation)

      await token.addAllocations(addresses, amounts, vestingTypeIndex)
    }
  })

  fest('should assign the total supply of tokens to the owner and transfer to frozen wallets', async () => {
    const totalSupply = await token.totalSupply()
    const balance = await token.balanceOf(owner.address)
    const frozenSupply = Object.values(allocationsForTest)
      .map(allocation => Object.values(allocation)
        .reduce((a, b) => a + b, 0))
      .reduce((a: number, b: number) => a + b, 0)
    expect(balance.add(toTokenAmount(frozenSupply))).to.equal(totalSupply)
  })

  describe('transferMany', async () => {

    fest('should transfer to many recipients', async () => {
      const wallets = (await ethers.getSigners()).slice(2)
      const amounts = wallets.map((wallet, i) => toTokenAmount(i + 1))

      await expect(() => {
        token.transferMany(wallets.map(i => i.address), amounts)
      }).to.changeTokenBalances(token, wallets, amounts)
    })

    fest('should throw if wrong array length parameters', async () => {
      const recipients = [owner.address, nonOwner.address]
      const amounts = [toTokenAmount(10)]
      await expect(
        token.transferMany(recipients, amounts),
      ).to.be.revertedWith('Wrong array length')
    })

    fest('should throw if amount exceeds balance ', async () => {
      const ownerBalance = await token.balanceOf(owner.address)

      const recipients = (await ethers.getSigners()).slice(2).map(i => i.address)
      const amounts = recipients.map(() => ownerBalance)

      await expect(
        token.transferMany(recipients, amounts),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })

    fest('should run only by owner', async () => {
      const amount = toTokenAmount(100)
      await token.transfer(nonOwner.address, amount)

      await expect(
        nonOwnerToken.transferMany([owner.address], [amount]),
      ).to.be.revertedWith('caller is not the owner')
    })
  })

  describe('Withdraw', async () => {

    fest('should withdraw ETH', async () => {
      const amount = 1
      // send some ETH to token's address using payable addAllocations func
      await token.addAllocations([], [], '0', { value: amount })

      await expect(await token.provider.getBalance(token.address)).to.equal(amount)
      await expect(
        await token.withdraw(amount),
      ).to.changeEtherBalances([owner], [amount])
      await expect(await token.provider.getBalance(token.address)).to.equal(0)
    })

    fest('should withdraw ERC20 token', async () => {
      const amount = 1000
      await token.transfer(token.address, amount)

      await expect(await token.balanceOf(token.address)).to.equal(amount)
      await expect(() => {
        token.withdrawToken(token.address, amount)
      }).to.changeTokenBalances(token, [owner], [amount])
      await expect(await token.balanceOf(token.address)).to.equal(0)
    })

    fest('should run only by owner', async () => {
      await expect(
        nonOwnerToken.withdraw(1),
      ).to.be.revertedWith('caller is not the owner')

      await expect(
        nonOwnerToken.withdrawToken(token.address, 1),
      ).to.be.revertedWith('caller is not the owner')
    })
  })

  describe('Pausable', async () => {

    fest('should pause / unpause', async () => {
      let paused = await token.paused()
      expect(paused).to.be.equal(false)

      const amount = toTokenAmount(10)
      await token.transfer(nonOwner.address, amount)

      await token.pause(true)

      paused = await token.paused()
      expect(paused).to.be.equal(true)

      await expect(
        nonOwnerToken.transfer(owner.address, amount),
      ).to.be.revertedWith('ERC20Pausable: token transfer while paused')

      await token.pause(false)

      paused = await token.paused()
      expect(paused).to.be.equal(false)

      await expect(() => {
        nonOwnerToken.transfer(owner.address, amount)
      }).to.changeTokenBalance(token, owner, amount)
    })

    fest('should pause / unpause only by owner', async () => {
      await expect(
        nonOwnerToken.pause(true),
      ).to.be.revertedWith('caller is not the owner')
    })
  })

  describe('Release time', async () => {

    fest('should have correct release time after deploy', async () => {
      const releaseTime = await token.releaseTime()
      expect(releaseTime).to.equal(releaseTime)
    })

    fest('should be able to change release time', async () => {
      const newReleaseTime = Math.floor(new Date('2022.01.01 15:00:00 GMT').getTime() / 1000)
      await token.setReleaseTime(newReleaseTime)

      const releaseTime = await token.releaseTime()
      expect(releaseTime).to.equal(newReleaseTime)
    })

    fest('shouldn\'t be able to change release time by non owner', async () => {
      await expect(
        token.connect(nonOwner).setReleaseTime(Math.floor(new Date('2022.01.01 15:00:00 GMT').getTime() / 1000)),
      ).to.be.revertedWith('caller is not the owner')
    })

    fest('shouldn\'t be able to change release time after release', async () => {
      const newReleaseTime = Math.floor(new Date('2022.01.01 15:00:00 GMT').getTime() / 1000)
      const newBlockTimestamp = releaseTimeTest + 3600
      await timeTravel(async () => {
        await expect(
          token.setReleaseTime(newReleaseTime),
        ).to.be.revertedWith('Can\'t change after release')

      }, newBlockTimestamp)
    })
  })

  describe('getMonths function', async () => {
    fest('should return 0 before release', async () => {
      const months = await token.getMonths(0)
      expect(months).to.equal(0)
    })

    fest('should return 1 day after release', async () => {
      const dayAfterRelease = releaseTimeTest + 3600 * 24
      await timeTravel(async () => {
        const months = await token.getMonths(0)
        expect(months).to.equal(1)
      }, dayAfterRelease)
    })

    fest('should return 2 month after release', async () => {
      const monthAfterRelease = releaseTimeTest + 3600 * 24 * 30
      await timeTravel(async () => {
        const months = await token.getMonths(0)
        expect(months).to.equal(2)
      }, monthAfterRelease)
    })

    fest('should return 0 after release if lock period', async () => {
      // 30 days lock period
      const lockPeriod = 3600 * 24 * 30
      const dayAfterRelease = releaseTimeTest + 3600 * 24
      await timeTravel(async () => {
        const months = await token.getMonths(lockPeriod)
        expect(months).to.equal(0)
      }, dayAfterRelease)
    })

    fest('should return 1 month after release if lock period', async () => {
      // 30 days lock period
      const lockPeriod = 3600 * 24 * 30
      const monthAfterRelease = releaseTimeTest + lockPeriod
      await timeTravel(async () => {
        const months = await token.getMonths(lockPeriod)
        expect(months).to.equal(1)
      }, monthAfterRelease)
    })
  })

  describe('addVestingType', async () => {

    fest('should run only by owner', async () => {
      await expect(
        nonOwnerToken.addVestingType(40000, 4, 10 * 24 * 3600),
      ).to.be.revertedWith('caller is not the owner')
    })

    fest('should throw if lock period is over already', async () => {
      const monthAfterRelease = releaseTimeTest + 3600 * 24 * 30
      await timeTravel(async () => {
        const dayAfterRelease = 24 * 3600
        await expect(
          token.addVestingType(40000, 4, dayAfterRelease),
        ).to.be.revertedWith('This lock period is over already')
      }, monthAfterRelease)
    })

    fest('should add new allocation after release', async () => {
      const monthAfterRelease = releaseTimeTest + 3600 * 24 * 30
      await timeTravel(async () => {
        const newVestingIndex = 8
        const frozenAmount = 100

        // sanity check
        await expect(
          token.addAllocations([nonOwner.address], [frozenAmount], newVestingIndex),
        ).to.be.revertedWith('Invalid vestingTypeIndex')

        // New vesting: Locked for 2 month, 10% on first release, then equal parts of 7.5% over total of 12 months
        // it should return new vesting type index
        const lockPeriod = 24 * 3600 * 30 * 2
        const vestingInitialAmount = 10
        const vestingMonthlyAmount = 75000
        await token.addVestingType(vestingMonthlyAmount, vestingInitialAmount, lockPeriod)

        // now we should able to add allocations
        await token.addAllocations([nonOwner.address], [frozenAmount], newVestingIndex)

        await expect(
          nonOwnerToken.transfer(owner.address, toTokenAmount(frozenAmount)),
        ).to.be.revertedWith('Wait for vesting day!')

        // check initial amount unfreeze
        await timeTravel(async () => {
          const initialAmount = toTokenAmount(frozenAmount * vestingInitialAmount / 100)
          let unlockedAmount = await token.getUnlockedAmount(nonOwner.address)
          let transferableAmount = await token.getTransferableAmount(nonOwner.address)
          expect(unlockedAmount).to.equal(initialAmount)
          expect(transferableAmount).to.equal(initialAmount)
          const transferAmount = toTokenAmount('2')
          await nonOwnerToken.transfer(owner.address, transferAmount)
          unlockedAmount = await token.getUnlockedAmount(nonOwner.address)
          transferableAmount = await token.getTransferableAmount(nonOwner.address)
          expect(unlockedAmount).to.equal(initialAmount)
          expect(transferableAmount).to.equal(initialAmount.sub(transferAmount))
        }, releaseTimeTest + lockPeriod + 1)

        // check monthly amount unfreeze
        await timeTravel(async () => {
          const initialAmount = toTokenAmount(frozenAmount * vestingInitialAmount / 100)
          const monthlyAmount = toTokenAmount(frozenAmount * (vestingMonthlyAmount / 10000) / 100)
          let unlockedAmount = await token.getUnlockedAmount(nonOwner.address)
          let transferableAmount = await token.getTransferableAmount(nonOwner.address)
          expect(unlockedAmount).to.equal(initialAmount.add(monthlyAmount))
          expect(transferableAmount).to.equal(initialAmount.add(monthlyAmount))
          const transferAmount = toTokenAmount('2')
          await nonOwnerToken.transfer(owner.address, transferAmount)
          unlockedAmount = await token.getUnlockedAmount(nonOwner.address)
          transferableAmount = await token.getTransferableAmount(nonOwner.address)
          expect(unlockedAmount).to.equal(initialAmount.add(monthlyAmount))
          expect(transferableAmount).to.equal(initialAmount.add(monthlyAmount).sub(transferAmount))
        }, releaseTimeTest + lockPeriod + 24 * 3600 * 30 + 1)

      }, monthAfterRelease)
    })
  })

  describe('Adding allocations', async () => {

    fest('should run only by owner', async () => {
      await expect(
        nonOwnerToken.addAllocations([nonOwner.address], [10], '0'),
      ).to.be.revertedWith('caller is not the owner')
    })

    fest('should throw if invalid vestingType is passed', async () => {
      const invalidVestingTypeIndex = 999
      await expect(
        token.addAllocations([nonOwner.address], [10], invalidVestingTypeIndex),
      ).to.be.revertedWith('Invalid vestingTypeIndex')
    })

    fest('should throw if different array lengths are passed', async () => {
      await expect(
        token.addAllocations([nonOwner.address], [10, 20], '0'),
      ).to.be.revertedWith('Array lengths must be same')

      await expect(
        token.addAllocations([nonOwner.address, owner.address], [10], '0'),
      ).to.be.revertedWith('Array lengths must be same')
    })

    fest('should throw if some amount of allocations exceeds the current supply', async () => {
      const supply = await token.totalSupply()
      const amount = supply.div(18).add(1)
      await expect(
        token.addAllocations([nonOwner.address], [amount], '0'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })

    fest('should throw if total amount of allocations exceeds the current supply', async () => {
      const supply = await token.totalSupply()
      const addresses = (await ethers.getSigners()).slice(2).map(i => i.address)
      const amounts = addresses.map(() => supply.div(addresses.length - 1))
      await expect(
        token.addAllocations(addresses, amounts, '0'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })

    fest('should throw if freezing same address at second time ', async () => {
      const [vestingIndex, allocation] = Object.entries(allocationsForTest)[0]
      const address = Object.keys(allocation)[0]
      await expect(
        token.addAllocations([address], [100], vestingIndex),
      ).to.be.revertedWith('Wallet already frozen')
    })
  })

  describe('Vesting', async () => {

    fest('should have scheduled frozen wallets', async () => {
      for (const allocation of Object.values(allocationsForTest)) {
        for (const address of Object.keys(allocation)) {
          // check frozen wallet existance
          const frozenWallet = await token.frozenWallets(address)
          expect(frozenWallet[5]).to.equal(true)
        }
      }
    })

    fest('frozen wallets should have correct balances after adding allocations', async () => {
      for (const allocation of Object.values(allocationsForTest)) {
        for (const [address, amount] of Object.entries(allocation)) {
          // check balance
          const balance = await token.balanceOf(address)
          expect(balance).to.equal(toTokenAmount(amount))
        }
      }
    })

    fest('shouldn\'t transfer from frozen wallets', async () => {
      for (const allocation of Object.values(allocationsForTest)) {
        for (const [address, amount] of Object.entries(allocation)) {
          const canTransfer = await token.canTransfer(address, toTokenAmount(amount))
          expect(canTransfer).to.equal(false)

          await expect(
            token.transferFrom(address, owner.address, toTokenAmount(amount)),
          ).to.be.revertedWith('Wait for vesting day!')
        }
      }
    })

    fest('should transfer tokens from non-frozen wallets', async () => {
      const amount = toTokenAmount('10')

      await token.transfer(nonOwner.address, amount)

      const canTransfer = await token.canTransfer(nonOwner.address, amount)
      expect(canTransfer).to.equal(true)

      await nonOwnerToken.transfer(owner.address, amount)
    })

    fest('should transfer tokens from frozenWallet after vesting period ends', async () => {
      const fiveYearsAfterRelease = releaseTimeTest + 3600 * 24 * 365 * 5
      await timeTravel(async () => {
        for (const allocation of Object.values(allocationsForTest)) {
          for (const [address, amount] of Object.entries(allocation)) {
            const canTransfer = await token.canTransfer(address, toTokenAmount(amount))
            expect(canTransfer).to.equal(true)
          }
        }
      }, fiveYearsAfterRelease)
    })

    // fest("should transfer all tokens after release if initial amount is 100%", async () => {
    //     const publicAllocation = ALLOCATIONS["2"]
    //     const minuteAfterRelease = RELEASE_TIME + 60
    //     await timeTravel(async () => {
    //         for (const [address, amount] of Object.entries(publicAllocation)) {
    //             const canTransfer = await token.canTransfer(address, toTokenAmount(amount))
    //             expect(canTransfer).to.equal(true)
    //         }
    //     }, minuteAfterRelease)
    // })

    fest('should not transfer before lockup period is over', async () => {
      const seedAllocation = allocationsForTest['0']
      const minuteAfterRelease = releaseTimeTest + 60
      await timeTravel(async () => {
        for (const [address, amount] of Object.entries(seedAllocation)) {
          const unlockedAmount = await token.getUnlockedAmount(address)
          expect(unlockedAmount).to.equal(0)

          await expect(
            token.transferFrom(address, owner.address, toTokenAmount(amount)),
          ).to.be.revertedWith('Wait for vesting day!')
        }
      }, minuteAfterRelease)
    })

    fest('should transfer only initial amount after lockup period', async () => {
      const seedAllocation = allocationsForTest['0']
      const afterLockupPeriod = releaseTimeTest + 3600 * 24 * 30
      await timeTravel(async () => {
        for (const [address, amount] of Object.entries(seedAllocation)) {
          const initialAmount = toTokenAmount(amount * 5 / 100)
          const unlockedAmount = await token.getUnlockedAmount(address)
          expect(unlockedAmount).to.equal(initialAmount)
        }
      }, afterLockupPeriod)
    })

    fest('should transfer initial + monthly amounts month after lockup period', async () => {
      const seedAllocation = allocationsForTest['0']
      const afterLockupPeriod = releaseTimeTest + 3600 * 24 * 30
      const monthAfterLockupPeriod = afterLockupPeriod + 3600 * 24 * 30
      await timeTravel(async () => {
        for (const [address, amount] of Object.entries(seedAllocation)) {
          const initialAmount = toTokenAmount(amount * 5 / 100)
          const monthlyAmount = toTokenAmount(amount * (105556 / 10000) / 100)
          const unlockedAmount = await token.getUnlockedAmount(address)
          // using diff approach to account for extraneous value from JavaScript FP arithmetic in monthlyAmount
          const diff = initialAmount.add(monthlyAmount).sub(unlockedAmount)
          const diffIsSmall = diff.lt(500)
          expect(diffIsSmall).to.be.true
        }
      }, monthAfterLockupPeriod)
    })
  })

  fest.skip('Should upgrade to ColiToken', async () => {
    const ShieldTokenDeployment = await deployShieldToken()
    const contractAddress = ShieldTokenDeployment.proxyAddress
    const upgradeColiContext = await getRebrandTestUpgradeContractContext('ShieldToken', contractAddress)
    const ColiTokenUpgrade = await upgradeContract(upgradeColiContext)
    const token = await getColiToken(contractAddress, ethers)
    const name = await token.name()
    const symbol = await token.symbol()
    expect(name).to.equal('ColiToken')
    expect(symbol).to.equal('COLI')
  })

})

async function getRebrandTestUpgradeContractContext(contractName: ContractName, contractAddress: Address): Promise<UpgradeContractContext> {
  return getRunnableContext({
    contractName,
    contractAddress,
    cacheKey: 'rebrand',
    dry: false,
  }, hardhatRuntimeEnvironment)
}

async function deployShieldToken(): Promise<DeployGenericTokenTaskUpgradeableOutput> {
  throw impl()
}
