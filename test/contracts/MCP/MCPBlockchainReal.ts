import { BaseToken, Mcp, QuoteToken } from "../../../typechain"

export class MCPBlockchainReal {
  constructor(readonly mcp: Mcp, readonly baseToken: BaseToken, readonly quoteToken: QuoteToken) {}
}
