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
import { RunnableTaskArgumentsSchema } from '../util/RunnableTaskArguments'
import { getRunnableContext } from '../util/context/getRunnableContext'
import { Logger, logNoop } from '../util/log'

export async function claimManyTask(args: ClaimManyBullTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getClaimManyBullTokenContext(args, hre)
  const { claimer: claimerAddress, claims: claimsPath, ethers, networkName, log } = context
  const signers = await ethers.getSigners()
  const signer = claimerAddress ? ensure(signers.find(s => s.address === claimerAddress)) : signers[0]
  log(`[INFO] Set claimer to ${signer.address}`)
  const addresses = await parseAddresses(fs.readFileSync(claimsPath))
  log(`[INFO] Read addresses from ${claimsPath}`)
  const token = await getBullTokenFromDeployment(networkName, ethers)
  log(`[INFO] Attached to contract ${token.address}`)
  await claimMany(token, addresses, ethers, log)
}

export async function claimMany(token: Contract, addresses: Address[], ethers: Ethers, log: Logger = logNoop): Promise<void> {
  if (addresses.length > 300) throw new Error('Can\'t claim if addresses array is longer than 300 elements')
  const tx = await token.claimMany(addresses)
  log(`[INFO] Set ${claimMany.name} transaction ${tx.hash}`)
}

export async function parseAddresses(data: Buffer | string): Promise<Address[]> {
  const rows = await neatcsv(data)
  return uniq(rows.map((row) => validateAddress(row['Address'])))
}

const ClaimManyBullTokenTaskArgumentsSchema = RunnableTaskArgumentsSchema.extend({
  claimer: AddressSchema.optional(),
  claims: z.string(), // Filename
})

type ClaimManyBullTokenTaskArguments = z.infer<typeof ClaimManyBullTokenTaskArgumentsSchema>

function validateClaimManyBullTokenTaskArguments(args: ClaimManyBullTokenTaskArguments) {
  return ClaimManyBullTokenTaskArgumentsSchema.parse(args)
}

async function getClaimManyBullTokenContext(args: ClaimManyBullTokenTaskArguments, hre: HardhatRuntimeEnvironment) {
  return {
    ...validateClaimManyBullTokenTaskArguments(args),
    ...await getRunnableContext(args, hre),
  }
}
