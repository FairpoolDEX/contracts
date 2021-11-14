import { BigNumber, BigNumberish, Contract, ContractFactory } from "ethers"
import { Ethers } from "../../util/types"
import UniswapV2FactoryJSON from "@uniswap/v2-core/build/UniswapV2Factory.json"
import { UniswapV2Factory } from "../../typechain"

export const uniswapFeeNumber = 0.003 // equal to 0.3%
export const uniswapFeeNumerator = BigNumber.from(3)
export const uniswapFeeDenominator = BigNumber.from(1000)
export const uniswapMinimumLiquidity = BigNumber.from(1000) // see MINIMUM_LIQUIDITY in UniswapV2Pair.sol

export async function deployUniswapPair(factory: UniswapV2Factory, token0: Contract, token1: Contract, ethers: Ethers) {
  await factory.createPair(token0.address, token1.address)
  const pairAddress = await factory.getPair(token0.address, token1.address)
  return await ethers.getContractAt("UniswapV2Pair" /* UniswapV2PairJSON.abi */, pairAddress)
}

export async function getUniswapV2FactoryContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory(UniswapV2FactoryJSON.abi, UniswapV2FactoryJSON.bytecode)
  // NOTE: Using precompiled ABI instead of locally compiled ABI because https://docs.uniswap.org/protocol/V2/guides/smart-contract-integration/quick-start#writing-tests (search for "precompiled")
  // return ethers.getContractFactory("UniswapV2Factory")
}

export async function getUniswapV2Router02ContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory("UniswapV2Router02") // ethers.getContractFactory(UniswapV2Router02JSON.abi, UniswapV2Router02JSON.bytecode)
}

export async function getUniswapV2PairContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory("UniswapV2Pair") // ethers.getContractFactory(UniswapV2PairJSON.abi, UniswapV2PairJSON.bytecode)
}

export async function getWETH9ContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory("WETH9") // ethers.getContractFactory(WETH9JSON.abi, WETH9JSON.bytecode)
}

export function toAmountAfterFee(amount: BigNumber) {
  return amount.mul(uniswapFeeDenominator.sub(uniswapFeeNumerator)).div(uniswapFeeDenominator)
}

export const getActualLiquidityShare = function(value: BigNumberish, liquidityAmount: BigNumber, isPoolCreator: boolean) {
  /**
   * Important: UniswapV2Pair burns MINIMUM_LIQUIDITY on pair creation, so liquidityAmount of the position that creates the pool is always less than expected liquidityAmount (difference is equal to MINIMUM_LIQUIDITY)
   * That means it's technically impossible to withdraw full liquidity from the pool
   */
  if (isPoolCreator) {
    const share = liquidityAmount.div(liquidityAmount.add(uniswapMinimumLiquidity))
    return BigNumber.from(value).mul(share)
  } else {
    return BigNumber.from(value)
  }
}
