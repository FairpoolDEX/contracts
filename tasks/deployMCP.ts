import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

// eslint-disable-file no-console

export async function deployMCP(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { feeDivisorMin } = args
  const { ethers, network, run } = hre
  const [deployer] = await ethers.getSigners()
  console.info(`[INFO] Deploying to ${network.name}`)
  console.info(`export MCP_DEPLOYER=${deployer.address}`)

  const MCP = await ethers.getContractFactory("MCP")
  const mcp = await MCP.deploy(feeDivisorMin)
  console.log(`MCP deployed`)
  console.log(`export MCP_ADDRESS=${mcp.address}`)

  console.info('Run this command to verify the contract:')
  console.info(`hardhat verify --contract contracts/MCP.sol:MCP --constructor-args ./tasks/arguments/MCP.arguments.ts --network ${network.name} ${mcp.address}`)

  // await run("verify", {
  //   address: mcp.address,
  //   constructorArgsParams: [feeDivisorMin.toString()],
  // })
}
