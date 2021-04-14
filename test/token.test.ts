import { ethers, upgrades } from "hardhat"
import { solidity } from "ethereum-waffle"
import { utils, BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import chai from "chai"
import { ShieldToken } from "../typechain/ShieldToken"

chai.use(solidity)
const { expect } = chai

const { hexlify, parseUnits, randomBytes } = utils

export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
export const toTokenAmount = (value: string | number): BigNumber => parseUnits(typeof value === "number" ? value.toString() : value, "18")
export const formatTokenAmount = (value: BigNumber): string => formatUnits(value, "18")
export const randomHexBytes = (n = 32): string => hexlify(randomBytes(n))

describe("ShieldToken", async () => {
  let token: ShieldToken
  beforeEach(async () => {
    const tokenFactory = await ethers.getContractFactory("ShieldToken")
    token = (await upgrades.deployProxy(tokenFactory, [])) as unknown as ShieldToken

    // token = (await tokenFactory.deploy()) as unknown as ShieldToken
    await token.deployed()
  })

  it("should return the total supply", async () => {
    const totalSupply = await token.totalSupply()
    expect(totalSupply).to.equal(toTokenAmount("969163000"))
  })

  it("should transfer tokens", async () => {
    await token.transfer("0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D", toTokenAmount("10"))
    const balance = await token.balanceOf("0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D")
    expect(balance).to.equal(toTokenAmount("10"))
  })

  // no tests needed besides the basic ones - the token simply extends well-tested ERC20 contract from OpenZeppelin library
})
