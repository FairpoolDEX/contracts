import { utils, BigNumber, Contract, ContractFactory } from "ethers"
import UniswapV2FactoryJSON from "@uniswap/v2-core/build/UniswapV2Factory.json"
import UniswapV2PairJSON from "@uniswap/v2-core/build/UniswapV2Pair.json"
import WETH9JSON from "@uniswap/v2-periphery/build/WETH9.json"
import UniswapV2Router02JSON from "@uniswap/v2-periphery/build/UniswapV2Router02.json"
import { Ethers } from "../../types"
import { toInteger } from "lodash"
import { DateTime } from "luxon"
import { DurationInput } from "luxon/src/duration"

export const toTokenAmount = (value: string | number): BigNumber => utils.parseUnits(typeof value === "number" ? value.toFixed(18) : value, "18")

export const fromTokenAmount = (value: BigNumber): number => parseFloat(utils.formatUnits(value, "18"))

export const toTokenAmountString = (value: string | number): string => toTokenAmount(value).toString()

export const MaxUint256 = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")

export function dateAdd(date: Date, duration: DurationInput) {
  return DateTime.fromJSDate(date).plus(duration).toJSDate()
}

export function chunk<T>(arr: T[], size: number): T[][] {
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
  return ethers.getContractFactory(UniswapV2PairJSON.abi, UniswapV2PairJSON.bytecode)
}

export async function mineBlocks(count: number, ethers: Ethers): Promise<void> {
  const network = await ethers.provider.getNetwork()
  if (network.chainId === 31337) {
    while (count--) {
      await ethers.provider.send("evm_mine", [])
    }
  }
}

export const seconds = 1000

export const minutes = 60 * seconds

export const hours = 60 * minutes

export const days = 24 * hours

export const months = 30 * days // nominal, not calendar

export const years = 12 * months
