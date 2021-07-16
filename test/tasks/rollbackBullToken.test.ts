import { ethers, upgrades } from "hardhat"
import { toTokenAmount, fromTokenAmount, getWETH9ContractFactory, getUniswapV2FactoryContractFactory, getUniswapV2Router02ContractFactory } from "../support/all.helpers"
import { addLiquidity, timeTravel } from "../support/test.helpers"
import { BullToken, QuoteToken } from "../../typechain"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { setClaims } from "../../tasks/setClaimsBullToken"
import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator, claims, deployedAddress, fromShieldToBull, getTestAddresses, getTestBalances } from "../support/BullToken.helpers"
import { claimBullToken } from "../../tasks/claimBullToken"
import { BalanceMap, Addresses } from "../../types"
import { ContractFactory, Wallet, utils, Contract } from "ethers"
import UniswapV2PairJSON from "@uniswap/v2-core/build/UniswapV2Pair.json"
import { expect } from "../../util/expect"

xdescribe("rollbackBullToken", async () => {
  let bullTokenFactory: ContractFactory

  let owner: SignerWithAddress, stranger: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, sam: SignerWithAddress
  let bullTokenWithOwner: BullToken, bullTokenWithStranger: BullToken, bullTokenWithAlice: BullToken, bullTokenWithBob: BullToken, bullTokenWithSam: BullToken

  let balances: BalanceMap
  let addresses: Addresses

  const defaultAmount = toTokenAmount("10000")

  const airdropFirstTimestamp = airdropStartTimestamp
  const airdropSecondTimestamp = airdropStartTimestamp + airdropStageDuration

  let uniswapV2Factory: Contract
  let uniswapV2Router: Contract
  let weth: Contract
  let quoteTokenWithOwner: QuoteToken

  before(async () => {
    // const deployShieldTokenResult = await hh(["deployShieldToken"])
    // const deployBullTokenResult = await hh(["deployBullToken"])
    // console.log("deployBullTokenResult", deployBullTokenResult)
  })

  beforeEach(async () => {
    [owner, stranger, alice, bob, sam] = await ethers.getSigners()

    bullTokenFactory = await ethers.getContractFactory("BullToken")
    bullTokenWithOwner = (await upgrades.deployProxy(bullTokenFactory, [airdropStartTimestamp, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])) as unknown as BullToken
    await bullTokenWithOwner.deployed()
    bullTokenWithStranger = bullTokenWithOwner.connect(stranger) as BullToken
    bullTokenWithAlice = bullTokenWithOwner.connect(alice)
    bullTokenWithBob = bullTokenWithOwner.connect(bob)
    bullTokenWithSam = bullTokenWithOwner.connect(sam)

    balances = await getTestBalances()
    addresses = await getTestAddresses()
    for (let i = 0; i < addresses.length; i++) {
      balances[addresses[i]] = defaultAmount
    }
    await setClaims(bullTokenWithOwner, balances)

    const quoteTokenFactory = await ethers.getContractFactory("QuoteToken")
    quoteTokenWithOwner = await quoteTokenFactory.deploy() as QuoteToken

    const wethContractFactory = await getWETH9ContractFactory(ethers)
    weth = await wethContractFactory.deploy()

    const UniswapV2FactoryContractFactory = await getUniswapV2FactoryContractFactory(ethers)
    uniswapV2Factory = await UniswapV2FactoryContractFactory.deploy(owner.address)

    const UniswapV2Router02ContractFactory = await getUniswapV2Router02ContractFactory(ethers)
    uniswapV2Router = await UniswapV2Router02ContractFactory.deploy(uniswapV2Factory.address, weth.address)
  })

  // https://www.dextools.io/app/uniswap/pair-explorer/0x59b8c20ca527ff18e2515b68f28939d6dd3e867b
  // https://etherscan.io/address/0x1bb022ab668085c6417b7d7007b0fbd53bacc383
  it("should download marked transfers", async () => {
    await timeTravel(async () => {
      await claimBullToken(bullTokenWithStranger, addresses, ethers)
      await claimBullToken(bullTokenWithAlice, addresses, ethers)
      const pair = await deployUniswapPair(uniswapV2Factory, bullTokenWithOwner as Contract, quoteTokenWithOwner as Contract)

      await bullTokenWithStranger.transfer(alice.address, toTokenAmount("10"))
      await bullTokenWithAlice.transfer(stranger.address, toTokenAmount("5"))

      await addLiquidity(uniswapV2Router, bullTokenWithOwner as Contract, quoteTokenWithOwner as Contract, toTokenAmount("10000000"), toTokenAmount("20000"), owner.address)

      // const { moves, buys, sells } = await getTransferSet(deployedAddress)
      //
      // expect(moves.length).to.be.greaterThan(1)
      // expect(moves).to.contain("https://etherscan.io/tx/0x062cc15e48c0bb0f0716e621aee83f583aa181ee5cd23136be90ade315ca351f#eventlog")
      //
      // expect(sells.length).to.be.greaterThan(1)
      // expect(sells).to.contain("https://etherscan.io/tx/0x583dab1745243b7b7e55b7eaffdfe684bae7c27dc3a55d6c50a4de9786f941ea")
      //
      // expect(buys.length).to.be.greaterThan(1)
      // expect(buys).to.contain("https://etherscan.io/tx/0x8c9e3365739d07718adc730fc4e30080c862e21b3101e4c13f36d19bc842d4e2")
    }, airdropFirstTimestamp)
  })

  it("should allow to claim the tokens", async () => {
    // TODO: Sells and buys should only be reflected on the next airdrop
    await timeTravel(async () => {
      await claimBullToken(bullTokenWithStranger, addresses, ethers)
      await claimBullToken(bullTokenWithAlice, addresses, ethers)
      await timeTravel(async () => {
        await bullTokenWithStranger.claim()
        const pair = await deployUniswapPair(uniswapV2Factory, bullTokenWithOwner as Contract, quoteTokenWithOwner as Contract)
        await sell(bullTokenWithStranger, pair)
        await sell(bullTokenWithAlice, pair)
        await buy(bullTokenWithBob, pair)
        await sell(bullTokenWithAlice, pair)
        await revert(bullTokenWithOwner, pair, airdropSecondTimestamp)
        await sync(pair)
        // expect(newBalances).deep.equal(oldBalances)
        // expect(canBuy(bullTokenWithStranger, pair))
        // expect(canSell(bullTokenWithStranger, pair))
        // expect(canTransfer(bullTokenWithStranger))
      }, airdropSecondTimestamp)
    }, airdropFirstTimestamp)
  })

})

async function deployUniswapPair(uniswapV2Factory: Contract, token0: Contract, token1: Contract) {
  await uniswapV2Factory.createPair(token0.address, token1.address)
  const pairAddress = await uniswapV2Factory.getPair(token0.address, token1.address)
  return await ethers.getContractAt(UniswapV2PairJSON.abi, pairAddress)
}

async function sell(token: BullToken, pair: Contract) {

}

async function buy(token: BullToken, pair: Contract) {

}

async function revert(token: BullToken, pair: Contract, timestamp: number) {

}

async function sync(pair: Contract) {

}
