import chai from "chai"
import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { toTokenAmount, fromTokenAmount } from "../support/all.helpers"
import { timeTravel, hh } from "../support/test.helpers"
import { ShieldToken } from "../../typechain/ShieldToken"
import { BullToken } from "../../typechain/BullToken"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Balances, parseAllBalancesCSV, setClaims } from "../../tasks/setClaimsBullToken"
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator, fromShieldToBull, getTestAddresses, getTestBalances } from "../support/BullToken.helpers"
import { claimBullToken, Addresses } from "../../tasks/claimBullToken"
import { Wallet, utils } from "ethers"

chai.use(solidity)
const { expect } = chai

describe("claimBullToken", async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  let balances: Balances
  let addresses: Addresses

  const defaultAmount = toTokenAmount("10000")

  before(async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
    // const deployBullTokenResult = await hh(["deployBullToken"])
    // console.log("deployBullTokenResult", deployBullTokenResult)
  })

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners()

    strangerAddress = await stranger.getAddress()
    ownerAddress = await owner.getAddress()

    const bullTokenFactory = await ethers.getContractFactory("BullToken")
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestamp, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger)

    balances = await getTestBalances()
    addresses = await getTestAddresses()
    for (let i = 0; i < addresses.length; i++) {
      balances[addresses[i]] = defaultAmount
    }
    await setClaims(bullTokenWithOwner, balances)
  })

  it("should allow to claim the tokens", async () => {
    await timeTravel(async () => {
      await claimBullToken(bullTokenWithStranger, addresses, ethers)
      for (let i = 0; i < addresses.length; i++) {
        expect(await bullTokenWithStranger.balanceOf(addresses[i])).to.equal(fromShieldToBull(defaultAmount))
      }
    }, airdropStartTimestamp)
  })

})
