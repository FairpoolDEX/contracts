import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { StringAllocations } from '../util-local/types'
import { chunk } from '../test/support/all.helpers'
import { BigNumber } from 'ethers'
import { expect } from '../util-local/expect'
import { maxSupplyTokenAmount } from '../test/support/ColiToken.helpers'

// NOTE: Amounts should be with decimals (with a dot)

export async function transferManyShieldTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const allocations: StringAllocations = (await import(args.allocations)).default
  const address = args.token

  const allocation = allocations['']
  if (!allocation || Object.keys(allocation).length === 0) {
    throw new Error('No allocations found for transferMany')
  }

  const recipients = Object.keys(allocation)
  const amounts = Object.values(allocation).map(i => hre.ethers.utils.parseUnits(i, '18'))
  const totalAmounts = amounts.reduce((acc, amount) => acc.add(amount), BigNumber.from(0))
  expect(totalAmounts.lt(maxSupplyTokenAmount)).to.be.true

  console.log(`Calling transferMany with ${recipients.length} recipients and chunk size ${args.chunk}:`)

  const chunkedRecipients = chunk(recipients, args.chunk)
  const chunkedAmounts = chunk(amounts, args.chunk)

  console.log(`Attaching to contract ${address}...`)

  const Token = await hre.ethers.getContractFactory('ShieldToken')
  const token = await Token.attach(address)

  for (let i = 0; i < chunkedRecipients.length; i++) {
    console.log(`Chunk ${i + 1} / ${chunkedRecipients.length}:`)
    const allocationChunk = chunkedRecipients[i].reduce((obj, address, index) => ({ ...obj, [address]: chunkedAmounts[i][index].toString() }), {})
    console.log(allocationChunk)

    const tx = await token.transferMany(chunkedRecipients[i], chunkedAmounts[i], { type: 2, gasLimit: 2500000 })
    console.log(`TX Hash: ${tx.hash}`)
  }
}
