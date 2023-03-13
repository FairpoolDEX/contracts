import { State } from '../../libs/fairpool/formulas/uni'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Fairpool } from 'typechain-types'

export type Model = State

export interface Real {
  hre: HardhatRuntimeEnvironment
  fairpool: Fairpool
}
