import { TokenReal } from "./TokenReal"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

export interface BlockchainReal {
  tokens: TokenReal[]
  signers: SignerWithAddress[]
}
