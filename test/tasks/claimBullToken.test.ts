import { find } from "lodash"
import chai from "chai"
import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { toTokenAmount, fromTokenAmount } from "../support/all.helpers"
import { timeTravel, hh } from "../support/test.helpers"
import { ShieldToken } from "../../typechain/ShieldToken"
import { BullToken } from "../../typechain/BullToken"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Balances, parseAllBalancesCSV, setClaims } from "../../tasks/setClaimsBullToken"
import * as fs from "fs"
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator, fromShieldToBull, getTestKeys, getTestBalances } from "../support/BullToken.helpers"
import { BigNumber } from "ethers"
import { claimBullToken, Keys } from "../../tasks/claimBullToken"
import { Wallet, utils } from "ethers"

chai.use(solidity)
const { expect } = chai

describe("claimBullToken", async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string
  const aliceAddress = "0x00000000000003441d59dde9a90bffb1cd3fabf1"
  const bobAddress = "0x7dcbefb3b9a12b58af8759e0eb8df05656db911d"
  const samAddress = "0x81dc6f15ee72f6e6d49cb6ca44c0bf8e63770027"
  const calAddress = "0xb3b7874f13387d44a3398d298b075b7a3505d8d4"

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  let keys: Keys
  let signers: Wallet[]
  let addresses: string[]
  let balances: Balances

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

    keys = await getTestKeys()
    signers = keys.map((key) => new ethers.Wallet(key))
    addresses = await Promise.all(signers.map((s) => s.getAddress()))
    balances = await getTestBalances()
    for (let i = 0; i < addresses.length; i++) {
      balances[addresses[i]] = defaultAmount
      await owner.sendTransaction({
        to: addresses[i],
        value: utils.parseEther("1.0"),
      })
    }
    await setClaims(bullTokenWithOwner, balances)
  })

  it("should allow to claim the tokens", async () => {
    await timeTravel(async () => {
      await claimBullToken(bullTokenWithStranger, keys, ethers)
      for (let i = 0; i < addresses.length; i++) {
        expect(await bullTokenWithStranger.balanceOf(addresses[i])).to.equal(fromShieldToBull(defaultAmount))
      }
    }, airdropStartTimestamp)
  })

})
