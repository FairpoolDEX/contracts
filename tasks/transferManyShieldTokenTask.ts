import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { StringAllocations } from '../utils-local/types'
import { chunk } from '../test/support/all.helpers'
import { BigNumber } from 'ethers'
import { expect } from '../utils-local/expect'
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

  console.info(`Calling transferMany with ${recipients.length} recipients and chunk size ${args.chunk}:`)

  const chunkedRecipients = chunk(recipients, args.chunk)
  const chunkedAmounts = chunk(amounts, args.chunk)

  console.info(`Attaching to contract ${address}...`)

  const Token = await hre.ethers.getContractFactory('ShieldToken')
  const token = await Token.attach(address)

  for (let i = 0; i < chunkedRecipients.length; i++) {
    console.info(`Chunk ${i + 1} / ${chunkedRecipients.length}:`)
    const allocationChunk = chunkedRecipients[i].reduce((obj, address, index) => ({ ...obj, [address]: chunkedAmounts[i][index].toString() }), {})
    console.info(allocationChunk)

    const tx = await token.transferMany(chunkedRecipients[i], chunkedAmounts[i], { type: 2, gasLimit: 2500000 })
    console.info(`TX Hash: ${tx.hash}`)
  }
}
