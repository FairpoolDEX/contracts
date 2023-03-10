import { Address } from '../models/Address'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { RunnableTaskArguments } from '../util-local/RunnableTaskArguments'
import { getRunnableContext, RunnableContext } from '../util-local/context/getRunnableContext'
import { AmountBN } from '../models/AmountBN'
import { getContractForSigner } from '../util-local/ethers'
import { Coliquidity, GenericToken } from '../typechain-types'
import { NetworkName } from '../models/NetworkName'
import { impl } from '../util/todo'
import { $zero } from '../data/allAddresses'
import { Signer, utils } from 'ethers'
import { OfferCreatedTopic } from '../test/support/Coliquidity.helpers'
import { ensure } from '../util/ensure'

export async function createPoolViaColiquidityTask(args: CreatePoolViaColiquidityTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getCreatePoolViaColiquidityContext(args, hre)
  const { log } = context
  await createPoolViaColiquidity(context)
}

export async function createPoolViaColiquidity(context: CreatePoolViaColiquidityContext): Promise<Address> {
  const { baseAddress, quoteAddress, baseAmount, quoteAmount, networkName, signer, ethers, log } = context
  const coliquidity = await getColiquidityForSigner(networkName, signer)
  const base = await getContractForSigner(ethers, 'GenericToken', baseAddress, signer) as unknown as GenericToken
  const quote = await getContractForSigner(ethers, 'GenericToken', quoteAddress, signer) as unknown as GenericToken
  await base.approve(coliquidity.address, baseAmount)
  await quote.approve(coliquidity.address, quoteAmount)
  const offerTx = await coliquidity.createOffer(baseAddress, baseAmount, $zero, [quoteAddress], 0, 0, true, 0, 0)
  log('Waiting for offerTx confirmation...')
  const offerTxReceipt = await offerTx.wait(1)
  const { logs } = offerTxReceipt
  const OfferCreatedEvent = ensure(logs.find(l => l.topics.includes(OfferCreatedTopic)))
  const coder = new utils.AbiCoder()
  // const topics = coder.decode(
  //   ['string', 'address', 'uint256'],
  //   OfferCreatedEvent.topics
  // )
  // return topics
  // const position = await coliquidity.createPosition()
  throw impl()
}

async function getColiquidityForSigner(networkName: NetworkName, signer: Signer) {
  return (await getColiquidity(networkName)).connect(signer)
}

async function getColiquidity(networkName: NetworkName): Promise<Coliquidity> {
  throw impl()
}

interface CreatePoolViaColiquidityTaskArguments extends RunnableTaskArguments {
  baseAddress: Address
  quoteAddress: Address
  baseAmount: AmountBN
  quoteAmount: AmountBN
}

export interface CreatePoolViaColiquidityContext extends CreatePoolViaColiquidityTaskArguments, RunnableContext {

}

export async function getCreatePoolViaColiquidityContext(args: CreatePoolViaColiquidityTaskArguments, hre: HardhatRuntimeEnvironment): Promise<CreatePoolViaColiquidityContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
