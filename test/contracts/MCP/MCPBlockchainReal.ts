import { BaseToken, MCP, QuoteToken } from "../../../typechain"

export class MCPBlockchainReal {
  constructor(readonly mcp: MCP, readonly baseToken: BaseToken, readonly quoteToken: QuoteToken) {}
}
