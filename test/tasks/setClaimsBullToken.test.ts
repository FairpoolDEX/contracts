import { ethers, upgrades } from 'hardhat'
import { toTokenAmount } from '../support/all.helpers'
import { timeTravel } from '../support/test.helpers'
import { BullToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { setClaims, SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator, fromShieldToBull, getBogusBalances, getTestBalanceMap, getTestExpectations, maxSupply } from '../support/BullToken.helpers'
import { BigNumber } from 'ethers'
import { expect } from '../../util/expect'
import { BalancesMap, getBalancesFromMap, mergeBalance } from '../../util/balance'
import { testSetClaimsContext } from '../support/context'
import { balanceBN, BalanceBN } from '../../models/BalanceBN'

describe('setClaimsBullToken', async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string
  const aliceAddress = '0x00000000000003441d59dde9a90bffb1cd3fabf1'
  const bobAddress = '0x7dcbefb3b9a12b58af8759e0eb8df05656db911d'
  const samAddress = '0x81dc6f15ee72f6e6d49cb6ca44c0bf8e63770027'
  const calAddress = '0xb3b7874f13387d44a3398d298b075b7a3505d8d4'
  const blackAddress = '0x011850bf8aeeea25f915d2bc983d5354ccb48836'

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  let balances: BalanceBN[]
  let balancesMap: BalancesMap
  let expectations: SetClaimsExpectationsMap

  before(async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
    // const deployBullTokenResult = await hh(["deployBullToken"])
    // console.log("deployBullTokenResult", deployBullTokenResult)
  })

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners()

    strangerAddress = await stranger.getAddress()
    ownerAddress = await owner.getAddress()

    const bullTokenFactory = await ethers.getContractFactory('BullToken')
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestamp, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger)

    balancesMap = await getTestBalanceMap()
    expectations = await getTestExpectations()
    balances = getBalancesFromMap(balancesMap)
  })

  it('should parse the CSV export', async () => {
    // should add 0 balances for old addresses
    // should not add 0 balances for current addresses
    expect(Object.keys(balancesMap).length).to.be.greaterThan(0)
    expect(balancesMap[aliceAddress]).to.equal(toTokenAmount('132814.914153007'))
    expect(balancesMap[bobAddress]).to.equal(toTokenAmount('202903588.651523003442269483'))
    expect(balancesMap[samAddress]).to.equal(toTokenAmount('1057303.141521371440022475'))
    expect(balancesMap[calAddress]).to.equal(toTokenAmount('0'))
    expect(balancesMap[blackAddress]).to.equal(toTokenAmount('0'))
  })

  it('should not parse a bogus CSV export', async () => {
    await expect(getBogusBalances()).to.be.rejectedWith('Can\'t parse balance')
  })

  it('should allow the owner to set claims multiple times', async () => {
    await setClaims(bullTokenWithOwner, balances, expectations, testSetClaimsContext)
    const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
    const calClaim = await bullTokenWithOwner.claims(calAddress)
    expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount('132814.914153007')))
    expect(calClaim).to.equal(fromShieldToBull(toTokenAmount('0')))
    await timeTravel(async () => {
      await setClaims(bullTokenWithOwner, balances, expectations, testSetClaimsContext)
      const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
      const calClaim = await bullTokenWithOwner.claims(calAddress)
      expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount('132814.914153007')))
      expect(calClaim).to.equal(fromShieldToBull(toTokenAmount('0')))
    }, airdropStartTimestamp + airdropStageDuration)
  })

  it('should not allow the stranger to set claims', async () => {
    await expect(
      setClaims(bullTokenWithStranger, balances, expectations, testSetClaimsContext),
    ).to.be.revertedWith('caller is not the owner')
    const aliceClaim = await bullTokenWithStranger.claims(aliceAddress)
    expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount('0')))
  })

  it('should allow the stranger to claim BULL', async () => {
    const strangerAmount = toTokenAmount('10000')
    const strangerBalances = mergeBalance(balances, balanceBN(strangerAddress, strangerAmount))
    await setClaims(bullTokenWithOwner, strangerBalances, expectations, testSetClaimsContext)
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(fromShieldToBull(strangerAmount))
    }, airdropStartTimestamp)
  })

  it('should allow multiple stages', async () => {
    const strangerAmount = BigNumber.from(maxSupply)
    const strangerBalances = mergeBalance(balances, balanceBN(strangerAddress, strangerAmount))
    await setClaims(bullTokenWithOwner, strangerBalances, expectations, testSetClaimsContext)
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(fromShieldToBull(strangerAmount))
      await timeTravel(async () => {
        const testBalances = getBalancesFromMap(await getTestBalanceMap())
        const strangerTestBalances = mergeBalance(testBalances, balanceBN(strangerAddress, strangerAmount))
        await setClaims(bullTokenWithOwner, strangerTestBalances, expectations, testSetClaimsContext)
        await bullTokenWithStranger.claim()
        expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(fromShieldToBull(strangerAmount.mul(2)))
      }, airdropStartTimestamp + airdropStageDuration)
    }, airdropStartTimestamp)
  })

})
