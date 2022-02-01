import fs from 'fs'
import { uniq } from 'lodash'
import neatcsv from 'neat-csv'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import type { Ethers } from '../util/types'
import { Contract } from 'ethers'
import { Address, AddressSchema, validateAddress } from '../models/Address'
import { ensure } from '../util/ensure'
import { z } from 'zod'
import { getBullTokenFromDeployment } from './util/getToken'
import { RunnableTaskArgumentsSchema } from '../util/task'
import { getRunnableContext } from '../util/context'
import { logDryRun } from '../util/dry'

export async function claimManyTask(args: claimManyBullTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getRunnableContext(args, hre)
  const { claimer: claimerAddress, claims: claimsPath, ethers, networkName, log, dry } = context
  const signers = await ethers.getSigners()
  const signer = claimerAddress ? ensure(signers.find(s => s.address === claimerAddress)) : signers[0]
  log(`[INFO] Set claimer to ${signer.address}`)
  const addresses = await parseAddresses(fs.readFileSync(claimsPath))
  log(`[INFO] Read addresses from ${claimsPath}`)
  const token = await getBullTokenFromDeployment(networkName, ethers)
  log(`[INFO] Attached to contract ${token.address}`)
  if (!dry) await claimMany(token, addresses, ethers, log)
  if (dry) logDryRun(log)
}

export async function claimMany(token: Contract, addresses: Address[], ethers: Ethers, log: ((msg: any) => void) | void): Promise<void> {
  if (addresses.length > 300) throw new Error('Can\'t claim if addresses array is longer than 300 elements')
  const tx = await token.claimMany(addresses)
  log && log(`[INFO] Set ${claimMany.name} transaction ${tx.hash}`)
}

export async function parseAddresses(data: Buffer | string): Promise<Address[]> {
  const rows = await neatcsv(data)
  return uniq(rows.map((row) => validateAddress(row['Address'])))
}

const claimManyBullTokenTaskArgumentsSchema = RunnableTaskArgumentsSchema.extend({
  claimer: AddressSchema.optional(),
  claims: z.string(), // Filename
})

type claimManyBullTokenTaskArguments = z.infer<typeof claimManyBullTokenTaskArgumentsSchema>

function validateClaimManyBullTokenTaskArguments(args: claimManyBullTokenTaskArguments) {
  return claimManyBullTokenTaskArgumentsSchema.parse(args)
}
