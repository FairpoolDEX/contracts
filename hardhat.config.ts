import { HardhatUserConfig } from "hardhat/types"
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "hardhat-watcher"
import "hardhat-typechain"
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { config as dotEnvConfig } from "dotenv"

dotEnvConfig()

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.4",
      },
    ],
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice: 100 * 1000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      timeout: 100000,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice: 100 * 1000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      timeout: 100000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  watcher: {
    run: {
      tasks: [
        "clean",
        { command: "compile", params: { quiet: true } },
        { command: "test", params: { noCompile: true, testFiles: ["testfile.ts"] } },
      ],
    },
  },
}


task("deploy", "Deploy token contract")
  .setAction(async (args, hre) => {
      const paramsFile = (hre.network.name === 'mainnet') ? './scripts/parameters.prod' : './scripts/parameters.test'
      const { RELEASE_TIME } = await import(paramsFile)

      const [deployer] = await hre.ethers.getSigners()
      console.log(`Deploying with the account: ${deployer.address}`)

      const Token = await hre.ethers.getContractFactory("ShieldToken")
      const token = await hre.upgrades.deployProxy(Token, [RELEASE_TIME])
      await token.deployed()
      console.log("Proxy address:", token.address) // eslint-disable-line no-console

      const implementationAddress = await getImplementationAddress(hre.ethers.provider, token.address)
      console.log("Implementation address:", implementationAddress) // eslint-disable-line no-console
  })


task("transferMany", "Call transferMany for allocations without lockup period")
  .addParam("token", "Token contract's address")
  .addParam("allocations", "JSON with allocations")
  .setAction(async (args, hre) => {
    const allocations = (await import(args.allocations)).default
    const address = args.token

    const allocation = allocations['']
    if (!allocation || Object.keys(allocation).length === 0) {
      throw new Error('No allocations found for transferMany')
    }

    console.log(`Attaching to contract ${address}...`)

    const Token = await hre.ethers.getContractFactory("ShieldToken")
    const token = await Token.attach(address)

    const recipients = Object.keys(allocation)
    const amounts = Object.values(allocation)

    console.log(`Calling transferMany for ${recipients.length} recipients...`) // eslint-disable-line no-console
    const tx = await token.transferMany(recipients, amounts)
    console.log(`TX Hash: ${tx.hash}`)
  })


task("addAllocations", "Call addAllocations for allocations with lockup period")
  .addParam("token", "Token contract's address")
  .addParam("allocations", "JSON with allocations")
  .setAction(async (args, hre) => {
    const allocations = (await import(args.allocations)).default
    const address = args.token

    console.log(`Attaching to contract ${address}...`)

    const Token = await hre.ethers.getContractFactory("ShieldToken")
    const token = await Token.attach(address)

    // // add allocations
    // for (const [vestingTypeIndex, allocation] of Object.entries(allocations)) {
    //   if (!vestingTypeIndex) {
    //     continue
    //   }
    //   const addresses = Object.keys(allocation)
    //   const amounts = Object.values(allocation)
    //   await token.addAllocations(addresses, amounts, vestingTypeIndex)

    //   console.log(`Vesting "${vestingTypeIndex}": added for ${addresses.length} addresses`) // eslint-disable-line no-console
    // }
  })

export default config
