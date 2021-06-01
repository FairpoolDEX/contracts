import chai from "chai"
import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { toTokenAmount, fromTokenAmount } from "../support/all.helpers"
import { timeTravel, hh } from "../support/test.helpers"
import { ShieldToken } from "../../typechain/ShieldToken"
import { BullToken } from "../../typechain/BullToken"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { parseBalancesCSV } from "../../tasks/setClaimsBullToken"
import * as fs from "fs"

chai.use(solidity)
const { expect } = chai

describe("setClaimsBullToken", async () => {

  let owner: SignerWithAddress
  let stranger: SignerWithAddress

  let ownerAddress: string
  let strangerAddress: string

  let shieldTokenWithOwner: ShieldToken
  let shieldTokenWithStranger: ShieldToken

  let bullTokenWithOwner: BullToken
  let bullTokenWithStranger: BullToken

  before(async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
    // const deployBullTokenResult = await hh(["deployBullToken"])
    // console.log("deployBullTokenResult", deployBullTokenResult)
  })

  // beforeEach(async () => {
  //   [owner, stranger] = await ethers.getSigners()
  //
  //   strangerAddress = await stranger.getAddress()
  //   ownerAddress = await owner.getAddress()
  //
  //   const shieldTokenFactory = await ethers.getContractFactory("ShieldToken")
  //   shieldTokenWithOwner = (await upgrades.deployProxy(shieldTokenFactory, [SHIELD_RELEASE_TIME])) as unknown as ShieldToken
  //   await shieldTokenWithOwner.deployed()
  //   shieldTokenWithStranger = shieldTokenWithOwner.connect(stranger)
  //
  //   const bullTokenFactory = await ethers.getContractFactory("BullToken")
  //   bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestamp, airdropClaimDuration, airdropStageDuration])) as unknown as BullToken
  //   await bullTokenWithOwner.deployed()
  //   bullTokenWithStranger = bullTokenWithOwner.connect(stranger)
  //
  //   // add allocations
  //   for (const [vestingTypeIndex, allocation] of Object.entries(SHIELD_ALLOCATIONS)) {
  //     const addresses = Object.keys(allocation)
  //     const amounts = Object.values(allocation)
  //
  //     await shieldTokenWithOwner.addAllocations(addresses, amounts, vestingTypeIndex)
  //   }
  // })

  it("should parse the CSV export", async () => {
    const data = await parseBalancesCSV(fs.createReadStream(`${__dirname}/../fixtures/SHLD.balances.csv`))
    expect(data.length).to.be.greaterThan(0)
    expect(data[0]).to.deep.equal({ address: "0x00000000000003441d59dde9a90bffb1cd3fabf1", amount: toTokenAmount("132814.914153007") })
  })

  it.skip("should set claims", async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
  })
})
