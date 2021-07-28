import { expect } from "../../../util/expect"
import { ContractTransaction } from "@ethersproject/contracts"

export class MCPCommand {
  async expectTxes(modelTxPromise: Promise<void>, realTxPromise: Promise<ContractTransaction>) {
    const [modelResult, realResult] = await Promise.allSettled([modelTxPromise, realTxPromise])
    try {
      expect(modelResult.status).to.equal(realResult.status)
      if (modelResult.status === "fulfilled" && realResult.status === "fulfilled") {
        expect(modelResult.value).to.equal(realResult.value)
      } else if (modelResult.status === "rejected" && realResult.status === "rejected") {
        expect(modelResult.reason).to.equal(realResult.reason)
      }
    } catch (e) {
      console.info("modelResult", modelResult)
      console.info("realResult", realResult)
      throw e
    }
  }
}
