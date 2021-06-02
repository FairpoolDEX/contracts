import { find } from "lodash"
import chai from "chai"
import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { toTokenAmount, fromTokenAmount } from "../support/all.helpers"
import { timeTravel, hh } from "../support/test.helpers"
import { ShieldToken } from "../../typechain/ShieldToken"
import { BullToken } from "../../typechain/BullToken"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { parseAllBalancesCSV, setClaims } from "../../tasks/setClaimsBullToken"
import * as fs from "fs"
import { airdropClaimDuration,airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator, fromShieldToBull, maxSupply } from "../support/BullToken.helpers"
import { BigNumber } from "ethers"

chai.use(solidity)
const { expect } = chai

async function getBalances() {
  const balancesCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.balances.csv`)
  const extrasCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.extras.csv`)
  const oldCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.old.csv`)
  return parseAllBalancesCSV([balancesCSV, extrasCSV], [oldCSV])
}

describe("setClaimsBullToken", async () => {

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
  })

  it("should parse the CSV export", async () => {
    // should add 0 balances for old addresses
    // should not add 0 balances for current addresses
    const balances = await getBalances()
    expect(Object.keys(balances).length).to.be.greaterThan(0)
    expect(balances[aliceAddress]).to.equal(toTokenAmount("132814.914153007"))
    expect(balances[bobAddress]).to.equal(toTokenAmount("202903588.651523003442269483"))
    expect(balances[samAddress]).to.equal(toTokenAmount("1057303.141521371440022475"))
    expect(balances[calAddress]).to.equal(toTokenAmount("0"))
  })

  it("should allow the owner to set claims multiple times", async () => {
    const balances = await getBalances()
    await setClaims(bullTokenWithOwner, balances)
    const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
    const calClaim = await bullTokenWithOwner.claims(calAddress)
    expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount("132814.914153007")))
    expect(calClaim).to.equal(fromShieldToBull(toTokenAmount("0")))
    await timeTravel(async () => {
      await setClaims(bullTokenWithOwner, balances)
      const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
      const calClaim = await bullTokenWithOwner.claims(calAddress)
      expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount("132814.914153007")))
      expect(calClaim).to.equal(fromShieldToBull(toTokenAmount("0")))
    }, airdropStartTimestamp + airdropStageDuration)
  })

  it("should not allow the stranger to set claims", async () => {
    const balances = await getBalances()
    await expect(
      setClaims(bullTokenWithStranger, balances),
    ).to.be.revertedWith("caller is not the owner")
    const aliceClaim = await bullTokenWithStranger.claims(aliceAddress)
    expect(aliceClaim).to.equal(fromShieldToBull(toTokenAmount("0")))
  })

  it("should allow the stranger to claim BULL", async () => {
    const strangerAmount = toTokenAmount("10000")
    const balances = await getBalances()
    balances[strangerAddress] = strangerAmount
    await setClaims(bullTokenWithOwner, balances)
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(fromShieldToBull(strangerAmount))
    }, airdropStartTimestamp)
  })

  it("should allow multiple stages", async () => {
    const strangerAmount = BigNumber.from(maxSupply)
    const balances = await getBalances()
    balances[strangerAddress] = strangerAmount
    await setClaims(bullTokenWithOwner, balances)
    await timeTravel(async () => {
      await bullTokenWithStranger.claim()
      expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(fromShieldToBull(strangerAmount))
      await timeTravel(async () => {
        const balances = await getBalances()
        balances[strangerAddress] = strangerAmount
        await setClaims(bullTokenWithOwner, balances)
        await bullTokenWithStranger.claim()
        expect(await bullTokenWithStranger.balanceOf(strangerAddress)).to.equal(fromShieldToBull(strangerAmount.mul(2)))
      }, airdropStartTimestamp + airdropStageDuration)
    }, airdropStartTimestamp)
  })

  })
