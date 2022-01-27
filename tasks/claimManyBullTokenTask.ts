import fs from 'fs'
import { uniq } from 'lodash'
import neatcsv from 'neat-csv'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import type { Ethers } from '../util/types'
import { Contract } from 'ethers'
import { Address, AddressSchema, validateAddress } from '../models/Address'
import { ensure } from '../util/ensure'
import { z } from 'zod'

export async function claimManyBullTokenTask(args: claimManyBullTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, claimer: claimerAddress, claims: claimsPath } = validateClaimManyBullTokenTaskArguments(args)
  const { ethers } = hre
  const signers = await ethers.getSigners()
  const signer = ensure(signers.find(s => s.address === claimerAddress))
  console.info(`[INFO] Claiming with ${signer.address}`)
  console.info(`[INFO] Reading addresses from ${claimsPath}`)
  const addresses = await parseAddresses(fs.readFileSync(claimsPath))
  console.info(`[INFO] Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory('BullToken')
  const token = await Token.attach(tokenAddress).connect(signer)
  console.info('[INFO] Claiming $BULL')
  await claimManyBullToken(token, addresses, ethers, console.info.bind(console))
}

export async function claimManyBullToken(token: Contract, addresses: Address[], ethers: Ethers, info: ((msg: any) => void) | void): Promise<void> {
  if (addresses.length > 300) {
    throw new Error('Can\'t claim if addresses array is longer than 300 elements')
  }
  const tx = await token.claimMany(addresses)
  info && info(`[INFO] TX hash: ${tx.hash}`)
}

export async function parseAddresses(data: Buffer | string): Promise<Address[]> {
  const rows = await neatcsv(data)
  return uniq(rows.map((row) => validateAddress(row['Address'])))
}

const claimManyBullTokenTaskArgumentsSchema = z.object({
  token: AddressSchema,
  claimer: AddressSchema,
  claims: z.string(), // Filename
})

type claimManyBullTokenTaskArguments = z.infer<typeof claimManyBullTokenTaskArgumentsSchema>

function validateClaimManyBullTokenTaskArguments(args: claimManyBullTokenTaskArguments) {
  return claimManyBullTokenTaskArgumentsSchema.parse(args)
}
