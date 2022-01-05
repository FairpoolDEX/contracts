import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { BalancesMap, parseBalancesCSV } from '../util/balance'
import fs from 'fs'
import { Logger } from '../util/log'
import { chunk } from '../test/support/all.helpers'
import { expect } from '../util/expect'
import { map } from 'lodash'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from '../test/support/BullToken.helpers'
import { getGasLimit } from '../util/gas'
import { network } from 'hardhat'
import { withFeeData } from '../util/network'
import { FeeData } from '@ethersproject/abstract-provider'
import { ContractName } from '../util/contract'
import { importExpectations } from '../util/expectation'
import { Address } from '../models/Address'
import { NetworkName, NetworkNameSchema } from '../models/Network'

export async function transferManyTask(args: TransferManyTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { contractName, contractAddress, balances: balancesPath, expectations: expectationsPath, dry } = args
  const { network, ethers } = hre
  const [deployer] = await ethers.getSigners()
  const feeData = await deployer.getFeeData()
  const balancesCSV = fs.readFileSync(balancesPath)
  const expectations: TransferManyExpectationsMap = await importExpectations(expectationsPath)
  console.info('Parsing balances')
  const balances = await parseBalancesCSV(balancesCSV)
  console.info(`Attaching to ${contractName} contract at ${contractAddress}`)
  const ContractFactory = await hre.ethers.getContractFactory(contractName)
  const contract = await ContractFactory.attach(contractAddress)
  console.info('Calling transferMany')
  const networkName = NetworkNameSchema.parse(network.name)
  await transferMany(contract, balances, expectations, 400, networkName, feeData, dry, console.info.bind(console))
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}

export async function transferMany(contract: any, balances: BalancesMap, expectations: TransferManyExpectationsMap, chunkSize = 325, network: NetworkName, feeData: FeeData, dry = false, log?: Logger): Promise<void> {
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
      console.log('getGasLimit(network)', getGasLimit(network))
      const tx = await contract.transferMany(addresses, amounts, withFeeData(feeData, { gasLimit: getGasLimit(network) }))
      log && log(`TX Hash: ${tx.hash}`)
    }
  }

  // TODO: Ensure balances don't contain smart contract addresses
  // TODO: Ensure sum(balances) = totalAmount
  // TODO: Ensure specific balances amounts (smoke test)
}

interface TransferManyTaskArguments extends TaskArguments {
  contractName: ContractName
  contractAddress: Address
}

export interface TransferManyExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalAmount: BigNumber,
}
