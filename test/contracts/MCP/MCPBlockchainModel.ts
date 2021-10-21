import { Address, AmountBN, PriceBN } from "../../../util/types"
import { expect } from "../../../util/expect"
import { Metronome } from "../../support/Metronome"
import { TokenModel } from "../../support/fast-check/models/TokenModel"

export class MCPBlockchainModel {
  public mcp: MCPModel = {
    protections: [],
  }

  constructor(public m: Metronome, public base: TokenModel, public quote: TokenModel) {}

  async buy(buyer: Address, seller: Address, guaranteedAmount: AmountBN, guaranteedPrice: PriceBN, expirationDate: Date, protectionPrice: PriceBN) {
    const creationDate = this.m.date()
    expect(expirationDate).gt(creationDate)
    this.mcp.protections.push({
      buyer,
      seller,
      guaranteedAmount,
      guaranteedPrice,
      expirationDate,
      protectionPrice,
      creationDate,
      status: Status.Bought,
    })
  }
}

export interface MCPModel {
  protections: Protection[]
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
