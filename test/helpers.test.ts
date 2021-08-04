import chai from "chai"
import { solidity } from "ethereum-waffle"
import { toTokenAmount } from "./support/all.helpers"
import Decimal from "decimal.js"
import { BigNumber } from "ethers"

chai.use(solidity)
const { expect } = chai

describe("Helpers", async () => {
  it("toTokenAmount", async () => {
    expect(toTokenAmount(new Decimal(10.1))).to.equal(BigNumber.from('10100000000000000000'))
  })
})
