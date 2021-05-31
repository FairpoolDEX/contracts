import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { Allocations } from "../types"

export async function transferManyShieldToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const allocations: Allocations = (await import(args.allocations)).default
  const address = args.token

  const allocation = allocations[""]
  if (!allocation || Object.keys(allocation).length === 0) {
    throw new Error("No allocations found for transferMany")
  }

  function chunk(arr: any[], size: number) {
    const result = []
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size))
    }
    return result
  }

  const recipients = Object.keys(allocation)
  const amounts = Object.values(allocation).map(i => hre.ethers.utils.parseUnits(i, "18"))

  console.log(`Calling transferMany with ${recipients.length} recipients and chunk size ${args.chunk}:`)

  const chunkedRecipients = chunk(recipients, args.chunk)
  const chunkedAmounts = chunk(amounts, args.chunk)

  console.log(`Attaching to contract ${address}...`)

  const Token = await hre.ethers.getContractFactory("ShieldToken")
  const token = await Token.attach(address)

  for (let i = 0; i < chunkedRecipients.length; i++) {
    console.log(`Chunk ${i + 1} / ${chunkedRecipients.length}:`)
    const allocationChunk = chunkedRecipients[i].reduce((obj, address, index) => ({ ...obj, [address]: chunkedAmounts[i][index].toString() }), {})
    console.log(allocationChunk)

    const tx = await token.transferMany(chunkedRecipients[i], chunkedAmounts[i], { gasLimit: 2500000 })
    console.log(`TX Hash: ${tx.hash}`)
  }
}
