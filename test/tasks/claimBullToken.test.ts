import { expect } from '../../util/expect'
import { ethers, upgrades } from 'hardhat'
import { toTokenAmount } from '../support/all.helpers'
import { timeTravel } from '../support/test.helpers'
import { BullToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { setClaims, SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestampForTest, burnRateDenominator, burnRateNumerator, getTestAddresses, getTestBalanceMap, getTestExpectations, setDefaultAmounts } from '../support/BullToken.helpers'
import { claimManyBullToken } from '../../tasks/claimManyBullTokenTask'
import { BalancesMap, getBalancesFromMap } from '../../util/balance'
import { Address } from '../../models/Address'
import { getTestSetClaimsContext } from '../support/context'
import { fest } from '../../util/mocha'

describe('claimBullToken', async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  let balancesMap: BalancesMap
  let addresses: Address[]
  let expectations: SetClaimsExpectationsMap

  const defaultAmount = toTokenAmount(10)

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

    addresses = await getTestAddresses()
    balancesMap = await setDefaultAmounts(await getTestBalanceMap(), addresses, defaultAmount)
    const balances = getBalancesFromMap(balancesMap)
    expectations = await getTestExpectations(balances, await getTestSetClaimsContext())
    await setClaims(bullTokenWithOwner, balances, await getTestSetClaimsContext())
  })

  fest('should allow to claim the tokens', async () => {
    await timeTravel(async () => {
      await claimManyBullToken(bullTokenWithStranger, addresses, ethers)
      for (let i = 0; i < addresses.length; i++) {
        expect(await bullTokenWithStranger.balanceOf(addresses[i])).to.equal(defaultAmount)
      }
    }, airdropStartTimestampForTest)
  })

})
