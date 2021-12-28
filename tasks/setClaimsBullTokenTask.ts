import fs from 'fs'
import { map, shuffle } from 'lodash'
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { Readable as ReadableStream } from 'stream'
import { chunk } from '../test/support/all.helpers'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from '../test/support/BullToken.helpers'
import { expect } from '../util/expect'
import { maxFeePerGas, maxPriorityFeePerGas } from '../util/gas'
import { BalanceMap, parseBalancesCSV } from '../util/balance'
import { CSVData } from '../util/csv'
import { shieldRewriteAddressMap } from '../test/support/ShieldToken.helpers'
import { rewriteBalanceMap } from '../util/address'
import { Logger } from '../util/log'

export async function parseShieldBalancesCSV(data: CSVData) {
  return rewriteBalanceMap(shieldRewriteAddressMap, await parseBalancesCSV(data))
}

export async function parseAllBalancesCSV(newDatas: Array<CSVData>, oldDatas: Array<string | Buffer | ReadableStream>, retroDatas: Array<string | Buffer | ReadableStream>, blacklistDatas: Array<string | Buffer | ReadableStream>): Promise<BalanceMap> {
  const balances: BalanceMap = {}
  // const address = '0xf5396ed020a765e561f4f176b1e1d622fb6d4154'.toLowerCase()
  for (let i = 0; i < newDatas.length; i++) {
    const _balances = await parseBalancesCSV(newDatas[i])
    for (const key of Object.keys(_balances)) {
      const _balance = _balances[key].mul(3)
      if (balances[key]) {
        balances[key] = balances[key].add(_balance)
      } else {
        balances[key] = _balance
      }
    }
  }
  for (let i = 0; i < retroDatas.length; i++) {
    const _balances = await parseBalancesCSV(retroDatas[i])
    for (const key of Object.keys(_balances)) {
      if (balances[key]) {
        balances[key] = balances[key].add(_balances[key])
      } else {
        balances[key] = _balances[key]
      }
    }
  }
  for (let i = 0; i < oldDatas.length; i++) {
    const _balances = await parseBalancesCSV(oldDatas[i])
    for (const key of Object.keys(_balances)) {
      if (!balances[key]) {
        balances[key] = BigNumber.from(0)
      }
    }
  }
  for (let i = 0; i < blacklistDatas.length; i++) {
    const _balances = await parseBalancesCSV(blacklistDatas[i])
    for (const key of Object.keys(_balances)) {
      balances[key] = BigNumber.from(0)
    }
  }
  return balances
}

export async function setClaims(token: any, balances: BalanceMap, expectations: SetClaimsExpectationsMap, chunkSize = 325, dry = false, log?: Logger): Promise<void> {
  // const { network } = hre
  // const blockGasLimits = { ropsten: 8000000, mainnet: 30000000 }
  // const blockGasLimit = network.name === "ropsten" || network.name === "mainnet" ? blockGasLimits[network.name] : null
  // if (!blockGasLimit) throw new Error("Undefined blockGasLimit")
  // NOTE: shuffle is used to achieve a normal distribution of zero balances: since each zero balance would result in a gas refund, we will normalize the gas refund across multiple transactions
  for (const _address in expectations.balances) {
    const address = _address.toLowerCase()
    expect(balances[address] || BigNumber.from('0'), `Address: ${address}`).to.equal(expectations.balances[_address])
  }
  const balancesArr = shuffle(Object.entries(balances))
  const balancesArrChunks = chunk(balancesArr, chunkSize)
  const totalSHLDAmount = balancesArr.reduce((acc, [address, amount]) => acc.add(amount), BigNumber.from(0))
  let totalBULLAmount = BigNumber.from(0)
  log && log('CUR', totalSHLDAmount.toString())
  log && log('MAX', expectations.totalSHLDAmount.max.toString())
  expect(totalSHLDAmount.gt(expectations.totalSHLDAmount.min)).to.be.true
  expect(totalSHLDAmount.lt(expectations.totalSHLDAmount.max)).to.be.true
  // const transactions = []
  for (let i = 0; i < balancesArrChunks.length; i++) {
    const entries = balancesArrChunks[i]
    const entriesForDisplay = balancesArrChunks[i].map(([address, amount]) => [address, amount.toString()])
    log && log(`Chunk ${i + 1} / ${balancesArrChunks.length}:`)
    // log && log(fromPairs(entriesForDisplay))
    const addresses = map(entries, 0)
    const amounts = (map(entries, 1) as BigNumber[]).map((amount: BigNumber) => amount.mul(airdropStageShareNumerator).div(airdropStageShareDenominator).mul(airdropRate))
    totalBULLAmount = amounts.reduce((acc, amount) => acc.add(amount), totalBULLAmount)
    if (!dry) {
      const tx = await token.setClaims(addresses, amounts, { gasLimit: 8000000, maxFeePerGas, maxPriorityFeePerGas })
      log && log(`TX Hash: ${tx.hash}`)
    }
  }
  log && log('totalBULLAmount', totalBULLAmount.toString())
  log && log('BCUR', '1490403967926689867814673435496')
  log && log('BADD', totalBULLAmount.toString())
  log && log('BMIN', expectations.totalBULLAmount.min.toString())
  log && log('BMAX', expectations.totalBULLAmount.max.toString())
  expect(totalBULLAmount.gt(expectations.totalBULLAmount.min)).to.be.true
  expect(totalBULLAmount.lt(expectations.totalBULLAmount.max)).to.be.true
}

export interface SetClaimsExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalSHLDAmount: { min: BigNumber, max: BigNumber },
  totalBULLAmount: { min: BigNumber, max: BigNumber },
}

export async function setClaimsBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, nextfolder, prevfolder, retrofolder, blacklistfolder, expectations: expectationsPath, dry } = args
  const nextfolderFiles = fs.readdirSync(nextfolder).map((filename) => fs.readFileSync(`${nextfolder}/${filename}`))
  const prevfolderFiles = fs.readdirSync(prevfolder).map((filename) => fs.readFileSync(`${prevfolder}/${filename}`))
  const retrofolderFiles = fs.readdirSync(retrofolder).map((filename) => fs.readFileSync(`${retrofolder}/${filename}`))
  const blacklistfolderFiles = fs.readdirSync(blacklistfolder).map((filename) => fs.readFileSync(`${blacklistfolder}/${filename}`))
  const expectations: SetClaimsExpectationsMap = (await import(expectationsPath)).expectations
  console.info('Parsing balances')
  const balances = await parseAllBalancesCSV(nextfolderFiles, prevfolderFiles, retrofolderFiles, blacklistfolderFiles)
  console.info(`Attaching to contract ${tokenAddress}`)
  const Token = await hre.ethers.getContractFactory('BullToken')
  const token = await Token.attach(tokenAddress)
  console.info('Setting claims')
  await setClaims(token, balances, expectations, 400, dry, console.info.bind(console))
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}
