import { BlockchainModel } from '../../support/fast-check/models/BlockchainModel'
import { BlockchainReal } from '../../support/fast-check/models/BlockchainReal'
import { MCP } from '../../../typechain-types'
import { Address } from '../../../models/Address'
import { AmountBN, PriceBN } from '../../../models/AmountBN' // export class MCPBlockchainModel {

// export class MCPBlockchainModel {
//   public mcp: MCPModel = {
//     protections: [],
//   }
//
//   constructor(public m: Metronome, public base: TokenModel, public quote: TokenModel) {}
//
//   async buy(buyer: Address, seller: Address, guaranteedAmount: AmountBN, guaranteedPrice: PriceBN, expirationDate: Date, protectionPrice: PriceBN) {
//     const creationDate = this.m.date()
//     expect(expirationDate).gt(creationDate)
//     this.mcp.protections.push({
//       buyer,
//       seller,
//       guaranteedAmount,
//       guaranteedPrice,
//       expirationDate,
//       protectionPrice,
//       creationDate,
//       status: Status.Bought,
//     })
//   }
// }

export interface MCPModel extends BlockchainModel {
  protections: Protection[]
}

export interface MCPReal extends BlockchainReal {
  mcp: MCP

}

export interface Protection {
  buyer: Address;
  seller: Address;
  guaranteedAmount: AmountBN;
  guaranteedPrice: PriceBN;
  expirationDate: Date;
  protectionPrice: PriceBN;
  creationDate: Date;
  status: Status;
}

export enum Status {
  Created,
  Bought,
  Sold,
  Used,
  Cancelled,
  Withdrawn
}
