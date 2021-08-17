import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

// eslint-disable-file no-console

export async function deployMCP(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { feeDivisorMin } = args
  const { ethers, network } = hre
  const [deployer] = await ethers.getSigners()
  console.info(`[INFO] Deploying to ${network.name}`)
  console.info(`export MCP_DEPLOYER=${deployer.address}`)

  const MCP = await ethers.getContractFactory('MCP')
  const mcp = await MCP.deploy(feeDivisorMin)
  console.log(`MCP deployed`)
  console.log(`export MCP_ADDRESS=${mcp.address}`)
}
