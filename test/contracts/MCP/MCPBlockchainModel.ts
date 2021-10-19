import { Address, Amount, Price } from "../../../util/types"
import { expect } from "../../../util/expect"
import { Metronome } from "../../support/Metronome"
import { TokenModel } from "../../support/fast-check/TokenModel"

export class MCPBlockchainModel {
  public mcp: MCPModel = {
    protections: [],
  }

  constructor(public m: Metronome, public base: TokenModel, public quote: TokenModel) {}

  async buy(buyer: Address, seller: Address, guaranteedAmount: Amount, guaranteedPrice: Price, expirationDate: Date, protectionPrice: Price) {
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
  guaranteedAmount: Amount;
  guaranteedPrice: Price;
  expirationDate: Date;
  protectionPrice: Price;
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
