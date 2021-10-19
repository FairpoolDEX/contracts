import { expect } from "../../../util/expect"
import { ContractTransaction } from "@ethersproject/contracts"
import { BlockchainCommand } from "../../support/fast-check/BlockchainCommand"
import { TokenModel } from "../../support/fast-check/TokenModel"
import { TokenReal } from "../../support/fast-check/TokenReal"

export abstract class ColiquidityCommand extends BlockchainCommand {

}

export interface ColiquidityBlockchainModel {
  tokens: TokenModel[]
}

export interface ColiquidityBlockchainReal {
  tokens: TokenReal[]
}
