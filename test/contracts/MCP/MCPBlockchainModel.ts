import { Address, Amount, Price, Timestamp } from "../../../types"
import { BigNumber } from "ethers"
import { expect } from "../../../util/expect"
import { Metronome } from "../../support/Metronome"

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

export interface TokenModel {
  balanceByAddress: BalanceByAddress
}

export type BalanceByAddress = { [address: string]: BigNumber }

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
