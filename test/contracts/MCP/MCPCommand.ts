import { expect } from "../../../util/expect"
import { ContractTransaction } from "@ethersproject/contracts"
import { BlockchainCommand } from "../../support/fast-check/commands/BlockchainCommand"
import { MCPModel, MCPReal } from "./MCPBlockchainModel"

export abstract class MCPCommand<Result> extends BlockchainCommand<MCPModel, MCPReal, Result> {

}
