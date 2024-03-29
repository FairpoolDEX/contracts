import hardhatRuntimeEnvironment, { ethers, upgrades } from 'hardhat'
import { toTokenAmount } from '../support/all.helpers'
import { timeTravel } from '../support/test.helpers'
import { BullToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { setClaims, SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { airdropClaimDuration, airdropDistributedTokenAmountSingleStage, airdropStageDuration, airdropStageFailureCount, airdropStageSuccessCount, airdropStartTimestampForTest, burnRateDenominator, burnRateNumerator, fromShieldToBull, getBogusBalances, getTestBalanceMap, getTestExpectations, maxSupply, pausedAt } from '../support/BullToken.helpers'
import { BigNumber } from 'ethers'
import { expect } from '../../utils-local/expect'
import { BalancesMap, getBalancesFromMap, mergeBalance } from '../../utils-local/balance'
import { getTestSetClaimsContext } from '../support/context'
import { balanceBN, BalanceBN, validateBalancesBN } from '../../models/BalanceBN'
import { Address, validateAddress } from '../../models/Address'
import { getClaimsFromBullToken, getClaimsFromColiToken, getClaimsFromRequests, getDistributionDates, WriteClaimsContext, writeClaimsTaskCacheTtl } from '../../tasks/writeClaimsTask'
import { fest, long } from '../../utils-local/mocha'
import { expectBalancesToMatch, expectTotalAmount } from '../../utils-local/expectation'
import { getERC20BalanceForAddressAtBlockTagCached, getERC20HolderAddressesAtBlockTag } from '../../tasks/util/getERC20Data'
import { ensure } from '../../utils/ensure'
import { findDeployment } from '../../data/allDeployments'
import { CS, KS, marketing, newHardwareDeployer, NFTradePool, oldSoftwareDeployer } from '../../data/allAddresses'
import validators, { getJordanBalanceOfShieldToken, getKSAmountFromBullToken } from '../expectations/writeClaims.rebrand'
import { validateWithContext } from '../../utils-local/validator'
import { getRunnableContext } from '../../utils-local/context/getRunnableContext'
import { unwrapNFTradeBalanceAtBlockTag } from '../../tasks/util/unwrapSmartContractBalancesAtBlockTag'
import { airdropStage3 } from '../../data/allBlocks'
import { validateRewrites } from '../../models/Rewrite'
import { tmpdir } from 'os'
import { getCachedContext } from '../../utils-local/context/getCachedContext'
import { sumAmountBNs } from '../../libs/ethereum/models/AmountBN/sumAmountBNs'

describe.skip('setClaimsBullToken', async () => {

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
    expectations = await getTestExpectations(balances, await getTestSetClaimsContext())
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
    await setClaims(bullTokenWithOwner, balances, await getTestSetClaimsContext())
    const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
    const calClaim = await bullTokenWithOwner.claims(calAddress)
    expect(aliceClaim).to.equal(toTokenAmount('132814.914153007'))
    expect(calClaim).to.equal(toTokenAmount('0'))
    await timeTravel(async () => {
      await setClaims(bullTokenWithOwner, balances, await getTestSetClaimsContext())
      const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
      const calClaim = await bullTokenWithOwner.claims(calAddress)
      expect(aliceClaim).to.equal(toTokenAmount('132814.914153007'))
      expect(calClaim).to.equal(toTokenAmount('0'))
    }, airdropStartTimestampForTest + airdropStageDuration)
  })

  fest('should not allow the stranger to set claims', async () => {
    await expect(
      setClaims(bullTokenWithStranger, balances, await getTestSetClaimsContext()),
    ).to.be.revertedWith('Ownable: caller is not the owner')
    const aliceClaim = await bullTokenWithStranger.claims(aliceAddress)
    expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount('0')))
  })

  fest('should allow the stranger to claim BULL', async () => {
    const strangerAmount = toTokenAmount('10000')
    const strangerBalances = mergeBalance(balances, balanceBN(strangerAddress, strangerAmount))
    const strangerExpectations = await getTestExpectations(strangerBalances, await getTestSetClaimsContext())
    await setClaims(bullTokenWithOwner, strangerBalances, await getTestSetClaimsContext())
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount)
    }, airdropStartTimestampForTest)
  })

  fest('should allow multiple stages', async () => {
    const strangerAmount = BigNumber.from(maxSupply)
    const strangerBalances = mergeBalance(balances, balanceBN(strangerAddress, strangerAmount))
    const strangerExpectations = await getTestExpectations(strangerBalances, await getTestSetClaimsContext())
    await setClaims(bullTokenWithOwner, strangerBalances, await getTestSetClaimsContext())
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount)
      await timeTravel(async () => {
        const testBalances = getBalancesFromMap(await getTestBalanceMap())
        const strangerTestBalances = mergeBalance(testBalances, balanceBN(strangerAddress, strangerAmount))
        const strangerTestExpectations = await getTestExpectations(strangerTestBalances, await getTestSetClaimsContext())
        await setClaims(bullTokenWithOwner, strangerTestBalances, await getTestSetClaimsContext())
        await bullTokenWithStranger.claim()
        expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(strangerAmount.mul(2))
      }, airdropStartTimestampForTest + airdropStageDuration)
    }, airdropStartTimestampForTest)
  })

  fest(getDistributionDates.name, async () => {
    const dates = await getDistributionDates()
    expect(dates.length).to.equal(airdropStageFailureCount)
  })

  long(getClaimsFromBullToken.name, async () => {
    const bullTotalSupply_2022_01_16 = BigNumber.from('1490403967926689867814673435496')
    const bullAddressesLength_2022_01_16 = 313
    const context = await getRebrandTestWriteClaimsContext()
    const deployment = ensure(findDeployment({ contract: 'BullToken', network: context.extra.network.name }))
    const addresses = await getERC20HolderAddressesAtBlockTag(pausedAt + 1, deployment.address, ethers, context.cache)
    expect(addresses.length).to.be.greaterThan(bullAddressesLength_2022_01_16)
    const claimsFromBullToken = await getClaimsFromBullToken(context)
    const unwrapSmartContractLuft = BigNumber.from(1)
    expectTotalAmount(bullTotalSupply_2022_01_16.sub(unwrapSmartContractLuft), claimsFromBullToken)
  })

  long(getClaimsFromColiToken.name, async () => {
    const context = await getRebrandTestWriteClaimsContext()
    const claimsFromBullToken = await getClaimsFromBullToken(context)
    const claimsFromShieldToken = await getClaimsFromColiToken(context)
    const sumClaimsFromBullToken = sumAmountBNs(claimsFromBullToken)
    const sumClaimsFromShieldToken = sumAmountBNs(claimsFromShieldToken)
    /**
     * Potential causes of luft:
     * - Uniswap burned liquidity (unlikely - expect passed after unwrap)
     * - mul-div truncation
     */
    const luft = BigNumber.from('18000')
    expect(sumClaimsFromShieldToken).to.be.gte(sumClaimsFromBullToken)
    expect(sumClaimsFromShieldToken).to.eq(airdropDistributedTokenAmountSingleStage.mul(airdropStageFailureCount).sub(luft))
    expectBalancesToMatch(validateBalancesBN([
      balanceBN(marketing, fromShieldToBull(toTokenAmount('155066079')).mul(airdropStageSuccessCount)),
    ]), claimsFromBullToken)
    expectBalancesToMatch(validateBalancesBN([
      balanceBN(marketing, fromShieldToBull(toTokenAmount('155066079')).mul(airdropStageFailureCount)),
    ]), claimsFromShieldToken)
  })

  long(getClaimsFromRequests.name, async () => {
    const context = await getRebrandTestWriteClaimsContext()
    const rewrites = validateRewrites([{ from: oldSoftwareDeployer, to: newHardwareDeployer }])
    const claims = await getClaimsFromRequests(rewrites, context)
    await validateWithContext(claims, validators, context)
  })

  long(getKSAmountFromBullToken.name, async () => {
    const context = await getRebrandTestWriteClaimsContext()
    const expectedAmount = await getKSAmountFromBullToken()
    const actualAmount = await getAmountFromBullToken(KS, context)
    expect(expectedAmount).to.eq(actualAmount)
  })

  long(unwrapNFTradeBalanceAtBlockTag.name, async () => {
    const context = await getRebrandTestWriteClaimsContext()
    const { cache, ethers } = context
    const blockTag = airdropStage3.number
    const shield = ensure(findDeployment({ contract: 'ColiToken', network: context.extra.network.name }))
    const balance = await getERC20BalanceForAddressAtBlockTagCached(NFTradePool, blockTag, shield.address, ethers, cache)
    const balances = await unwrapNFTradeBalanceAtBlockTag(balance, blockTag, shield.address, context)
    const everyBalanceIsPositive = balances.every(b => b.amount.gte(0))
    const CSBalance = balances.find(b => b.address === CS)
    const KSBalance = balances.find(b => b.address === KS)
    expect(everyBalanceIsPositive).to.be.true
    expect(balances.length).to.be.greaterThan(10)
    expect(balance.amount).to.be.closeTo(sumAmountBNs(balances), 1)
    expect(CSBalance).to.exist
    expect(KSBalance).to.not.exist
    expect(CSBalance?.amount).to.equal(toTokenAmount('1000000'))
    // console.log('balances', balances)
    // expect(expectedAmount).to.eq(actualAmount)
  })

  fest(getJordanBalanceOfShieldToken.name, async () => {
    expect(getJordanBalanceOfShieldToken()).to.eq(BigNumber.from('1376074283419820655650360'))
  })
})

async function getAmountFromBullToken(address: Address, context: WriteClaimsContext) {
  const claims = await getClaimsFromBullToken(context)
  const claimsForAddress = claims.filter(c => c.address === address)
  expect(claimsForAddress).to.have.length(1)
  return claimsForAddress[0].amount
}

async function getRebrandTestWriteClaimsContext(): Promise<WriteClaimsContext> {
  const args = { cacheKey: 'rebrand', cacheTtl: writeClaimsTaskCacheTtl }
  return {
    ...await getRunnableContext(args, hardhatRuntimeEnvironment),
    ...await getCachedContext(args, hardhatRuntimeEnvironment),
    out: `${tmpdir()}/testWriteClaims.json`,
    rewrites: '',
    expectations: '',
  }
}
