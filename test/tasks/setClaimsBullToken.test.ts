import { ethers, upgrades } from 'hardhat'
import { toTokenAmount } from '../support/all.helpers'
import { timeTravel } from '../support/test.helpers'
import { BullToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { setClaims, SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestampForTest, burnRateDenominator, burnRateNumerator, fromShieldToBull, getBogusBalances, getTestBalanceMap, getTestExpectations, maxSupply, pausedAt } from '../support/BullToken.helpers'
import { BigNumber } from 'ethers'
import { expect } from '../../util/expect'
import { BalancesMap, getBalancesFromMap, mergeBalance } from '../../util/balance'
import { testSetClaimsContext, testWriteClaimsContext } from '../support/context'
import { balanceBN, BalanceBN } from '../../models/BalanceBN'
import { validateAddress } from '../../models/Address'
import { getClaimsFromBullToken, WriteClaimsContext } from '../../tasks/writeClaimsTask'
import { fest, long } from '../../util/mocha'
import { expectTotalAmount } from '../../util/expectation'
import { getERC20HolderAddressesAtBlockTag } from '../../tasks/util/getERC20Data'
import { ensure } from '../../util/ensure'
import { findDeployment } from '../../data/allDeployments'

describe('setClaimsBullToken', async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string
  const aliceAddress = validateAddress('0x00000000000003441d59dde9a90bffb1cd3fabf1')
  const bobAddress = validateAddress('0x7dcbefb3b9a12b58af8759e0eb8df05656db911d')
  const samAddress = validateAddress('0x81dc6f15ee72f6e6d49cb6ca44c0bf8e63770027')
  const calAddress = validateAddress('0xb3b7874f13387d44a3398d298b075b7a3505d8d4')
  const blackAddress = validateAddress('0x011850bf8aeeea25f915d2bc983d5354ccb48836')

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
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestampForTest, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger)

    balancesMap = await getTestBalanceMap()
    balances = getBalancesFromMap(balancesMap)
    expectations = await getTestExpectations(balances, testSetClaimsContext)
  })

  fest('should parse the CSV export', async () => {
    // should add 0 balances for old addresses
    // should not add 0 balances for current addresses
    expect(Object.keys(balancesMap).length).to.be.greaterThan(0)
    expect(balancesMap[aliceAddress]).to.equal(toTokenAmount('132814.914153007'))
    expect(balancesMap[bobAddress]).to.equal(toTokenAmount('202903588.651523003442269483'))
    expect(balancesMap[samAddress]).to.equal(toTokenAmount('1057303.141521371440022475'))
    expect(balancesMap[calAddress]).to.equal(toTokenAmount('0'))
    expect(balancesMap[blackAddress]).to.equal(toTokenAmount('0'))
  })

  fest('should not parse a bogus CSV export', async () => {
    await expect(getBogusBalances()).to.be.rejectedWith('Can\'t parse balance')
  })

  fest('should allow the owner to set claims multiple times', async () => {
    await setClaims(bullTokenWithOwner, balances, expectations, testSetClaimsContext)
    const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
    const calClaim = await bullTokenWithOwner.claims(calAddress)
    expect(aliceClaim).to.equal(toTokenAmount('132814.914153007'))
    expect(calClaim).to.equal(toTokenAmount('0'))
    await timeTravel(async () => {
      await setClaims(bullTokenWithOwner, balances, expectations, testSetClaimsContext)
      const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
      const calClaim = await bullTokenWithOwner.claims(calAddress)
      expect(aliceClaim).to.equal(toTokenAmount('132814.914153007'))
      expect(calClaim).to.equal(toTokenAmount('0'))
    }, airdropStartTimestampForTest + airdropStageDuration)
  })

  fest('should not allow the stranger to set claims', async () => {
    await expect(
      setClaims(bullTokenWithStranger, balances, expectations, testSetClaimsContext),
    ).to.be.revertedWith('caller is not the owner')
    const aliceClaim = await bullTokenWithStranger.claims(aliceAddress)
    expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount('0')))
  })

  fest('should allow the stranger to claim BULL', async () => {
    const strangerAmount = toTokenAmount('10000')
    const strangerBalances = mergeBalance(balances, balanceBN(strangerAddress, strangerAmount))
    const strangerExpectations = await getTestExpectations(strangerBalances, testSetClaimsContext)
    await setClaims(bullTokenWithOwner, strangerBalances, strangerExpectations, testSetClaimsContext)
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount)
    }, airdropStartTimestampForTest)
  })

  fest('should allow multiple stages', async () => {
    const strangerAmount = BigNumber.from(maxSupply)
    const strangerBalances = mergeBalance(balances, balanceBN(strangerAddress, strangerAmount))
    const strangerExpectations = await getTestExpectations(strangerBalances, testSetClaimsContext)
    await setClaims(bullTokenWithOwner, strangerBalances, strangerExpectations, testSetClaimsContext)
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount)
      await timeTravel(async () => {
        const testBalances = getBalancesFromMap(await getTestBalanceMap())
        const strangerTestBalances = mergeBalance(testBalances, balanceBN(strangerAddress, strangerAmount))
        const strangerTestExpectations = await getTestExpectations(strangerTestBalances, testSetClaimsContext)
        await setClaims(bullTokenWithOwner, strangerTestBalances, strangerTestExpectations, testSetClaimsContext)
        await bullTokenWithStranger.claim()
        expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount.mul(2))
      }, airdropStartTimestampForTest + airdropStageDuration)
    }, airdropStartTimestampForTest)
  })

  long(getClaimsFromBullToken.name, async () => {
    const bullTotalSupply_2022_01_16 = BigNumber.from('1490403967926689867814673435496')
    const bullAddressesLength_2022_01_16 = 313
    const context: WriteClaimsContext = { ...testWriteClaimsContext, networkName: 'mainnet' }
    const deployment = ensure(findDeployment({ contract: 'BullToken', network: context.networkName }))
    const addresses = await getERC20HolderAddressesAtBlockTag(pausedAt + 1, deployment.address, ethers)
    expect(addresses.length).to.be.greaterThan(bullAddressesLength_2022_01_16)
    const claimsFromBullToken = await getClaimsFromBullToken(context)
    expectTotalAmount(claimsFromBullToken, bullTotalSupply_2022_01_16)
  })

})
