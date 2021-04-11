import { ethers } from "hardhat"
import { solidity } from "ethereum-waffle"
import chai from "chai"
import { Token } from "../typechain/Token"

chai.use(solidity)
const { expect } = chai

describe("Token", async () => {
  let token: Token
  beforeEach(async () => {
    const tokenFactory = await ethers.getContractFactory("Token")
    token = (await tokenFactory.deploy()) as Token
    await token.deployed()
  })

  it("should return the total supply", async () => {
    expect(await token.totalSupply()).to.equal(969163000 * 10 ** 18)
  })

  it("should transfer tokens", async () => {
    // TODO
    // await token.setGreeting("Hola, mundo!");
    // expect(await token.greet()).to.equal("Hola, mundo!");
  })
})
