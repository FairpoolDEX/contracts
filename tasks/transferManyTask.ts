import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { BalanceMap, parseBalancesCSV } from '../util/balance'
import fs from 'fs'
import { Logger } from '../util/log'
import { chunk } from '../test/support/all.helpers'
import { expect } from '../util/expect'
import { map } from 'lodash'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from '../test/support/BullToken.helpers'
import { getGasLimit, maxFeePerGas, maxPriorityFeePerGas } from '../util/gas'
import { network } from 'hardhat'
import { NetworkName } from '../util/network'

export interface TransferManyExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalAmount: BigNumber,
}

export async function transferMany(contract: any, balances: BalanceMap, expectations: TransferManyExpectationsMap, chunkSize = 325, network: NetworkName, dry = false, log?: Logger): Promise<void> {
  const balancesArr = Object.entries(balances)
  const balancesArrChunks = chunk(balancesArr, chunkSize)
  const totalAmount = balancesArr.reduce((acc, [address, amount]) => acc.add(amount), BigNumber.from(0))
  expect(totalAmount).to.be.equal(expectations.totalAmount)
  for (let i = 0; i < balancesArrChunks.length; i++) {
    const entries = balancesArrChunks[i]
    const entriesForDisplay = balancesArrChunks[i].map(([address, amount]) => [address, amount.toString()])
    log && log(`Chunk ${i + 1} / ${balancesArrChunks.length}:`)
    // log && log(fromPairs(entriesForDisplay))
    const addresses = map(entries, 0)
    const amounts = (map(entries, 1) as BigNumber[]).map((amount: BigNumber) => amount.mul(airdropStageShareNumerator).div(airdropStageShareDenominator).mul(airdropRate))
    // totalBULLAmount = amounts.reduce((acc, amount) => acc.add(amount), totalBULLAmount)
    if (!dry) {
      const tx = await contract.transferMany(addresses, amounts, { gasLimit: getGasLimit(network), maxFeePerGas, maxPriorityFeePerGas })
      log && log(`TX Hash: ${tx.hash}`)
    }
  }

  // TODO: Ensure balances don't contain smart contract addresses
  // TODO: Ensure sum(balances) = totalAmount
  // TODO: Ensure specific balances amounts (smoke test)
}

interface TransferManyTaskArguments extends TaskArguments {
  contract: 'BullToken' | 'ShieldToken'
}

export async function transferManyTask(args: TransferManyTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { contract: contractName, address: contractAddress, balances: balancesPath, expectations: expectationsPath, dry } = args
  const { network } = hre
  const balancesCSV = fs.readFileSync(balancesPath)
  const expectations: TransferManyExpectationsMap = (await import(expectationsPath)).expectations
  console.info(`Parsing balances`)
  const balances = await parseBalancesCSV(balancesCSV)
  console.info(`Attaching to ${contractName} contract at ${contractAddress}`)
  const ContractFactory = await hre.ethers.getContractFactory(contractName)
  const contract = await ContractFactory.attach(contractAddress)
  console.info(`Calling transferMany`)
  await transferMany(contract, balances, expectations, 400, network.name as NetworkName, dry, console.info.bind(console))
  if (dry) console.info(`Dry run completed, no transactions were sent. Remove the '--dry true' flag to send transactions.`)
}
