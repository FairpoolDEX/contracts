import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

// eslint-disable-file no-console

export async function deployMCP(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { feeDivisorMin } = args
  const { ethers } = hre
  const MCP = await ethers.getContractFactory('MCP')
  const mcp = await MCP.deploy(feeDivisorMin)
  console.log(`MCP deployed`)
  console.log(`export MCP_ADDRESS=${mcp.address}`)
}
