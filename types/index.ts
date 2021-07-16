import { BigNumber, ethers } from "ethers"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"

export type Address = string;

export type Addresses = Address[];

export type Amount = BigNumber

export type BalanceMap = { [index: string]: Amount }

export type Ethers = typeof ethers & HardhatEthersHelpers;

export interface Allocation {
  [address: string]: string;
}

export interface Allocations {
  [id: string]: Allocation;
}
