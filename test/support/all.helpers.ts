import { ethers } from "hardhat"
import { utils, BigNumber, Contract, ContractFactory } from "ethers"
import UniswapV2FactoryJSON from "@uniswap/v2-core/build/UniswapV2Factory.json"
import UniswapV2PairJSON from "@uniswap/v2-core/build/UniswapV2Pair.json"
import WETH9JSON from "@uniswap/v2-periphery/build/WETH9.json"
import UniswapV2Router02JSON from "@uniswap/v2-periphery/build/UniswapV2Router02.json"
import { Ethers } from "../../types"

export const toTokenAmount = (value: string | number): BigNumber => utils.parseUnits(typeof value === "number" ? value.toFixed(18) : value, "18")

export const fromTokenAmount = (value: BigNumber): number => parseFloat(utils.formatUnits(value, "18"))

export const toTokenAmountString = (value: string | number): string => toTokenAmount(value).toString()

export const days: number = 24 * 60 * 60

export const MaxUint256 = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")

export function chunk(arr: any[], size: number): Array<Array<any>> {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export async function getWETH9ContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory(WETH9JSON.abi, WETH9JSON.bytecode)
}

export async function getUniswapV2FactoryContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory(UniswapV2FactoryJSON.abi, UniswapV2FactoryJSON.bytecode)
}

export async function getUniswapV2Router02ContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory(UniswapV2Router02JSON.abi, UniswapV2Router02JSON.bytecode)
}

export async function getUniswapV2PairContractFactory(ethers: Ethers): Promise<ContractFactory> {
  return ethers.getContractFactory(UniswapV2Router02JSON.abi, UniswapV2Router02JSON.bytecode)
}
