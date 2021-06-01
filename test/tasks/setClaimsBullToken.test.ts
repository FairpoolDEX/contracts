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
import { airdropClaimDuration, airdropRate, airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator } from "../support/BullToken.helpers"

chai.use(solidity)
const { expect } = chai

async function getBalances() {
  const balancesCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.balances.csv`)
  const extrasCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.extras.csv`)
  return parseAllBalancesCSV([balancesCSV, extrasCSV])
}

describe("setClaimsBullToken", async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string
  const aliceAddress = "0x00000000000003441d59dde9a90bffb1cd3fabf1"
  const bobAddress = "0x7dcbefb3b9a12b58af8759e0eb8df05656db911d"
  const samAddress = "0x81dc6f15ee72f6e6d49cb6ca44c0bf8e63770027"

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
    const balances = await getBalances()
    expect(balances.length).to.be.greaterThan(0)
    const impBalance = find(balances, { address: aliceAddress })
    const depBalance = find(balances, { address: bobAddress })
    const stylBalance = find(balances, { address: samAddress })
    if (!impBalance) throw new Error()
    if (!depBalance) throw new Error()
    if (!stylBalance) throw new Error()
    expect(impBalance.amount).to.equal(toTokenAmount("132814.914153007"))
    expect(depBalance.amount).to.equal(toTokenAmount("202903588.651523003442269483"))
    expect(stylBalance.amount).to.equal(toTokenAmount("1057303.141521371440022475"))
  })

  it("should allow the owner to set claims", async () => {
    const balances = await getBalances()
    await setClaims(bullTokenWithOwner, balances)
    const aliceClaim = await bullTokenWithOwner.claims(aliceAddress)
    expect(aliceClaim).to.equal(toTokenAmount("132814.914153007").mul(airdropRate))
  })

  it("should not allow the stranger to set claims", async () => {
    const balances = await getBalances()
    await expect(
      setClaims(bullTokenWithStranger, balances)
    ).to.be.revertedWith("caller is not the owner")
    const aliceClaim = await bullTokenWithStranger.claims(aliceAddress)
    expect(aliceClaim).to.equal(toTokenAmount("0").mul(airdropRate))
  })

})
