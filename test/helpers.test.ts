import { expect } from "../util/expect"
import { toTokenAmount } from "./support/all.helpers"
import Decimal from "decimal.js"
import { BigNumber } from "ethers"


describe("Helpers", async () => {
  it("toTokenAmount", async () => {
    expect(toTokenAmount(new Decimal(10.1))).to.equal(BigNumber.from('10100000000000000000'))
  })
})
