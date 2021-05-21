import { HardhatUserConfig } from "hardhat/types"
import { task, types } from "hardhat/config"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "hardhat-watcher"
import "hardhat-typechain"
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { config as dotEnvConfig } from "dotenv"

dotEnvConfig()

const gasPrice = 150 * 1000000000

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
    localhost: {
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      timeout: 24 * 60 * 60 * 1000,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice,
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

interface Allocation {
  [address: string]: string;
}

interface Allocations {
  [id: string]: Allocation;
}

task("deploy", "Deploy token contract")
  .setAction(async (args, hre) => {
    const paramsFile = (hre.network.name === "mainnet") ? "./scripts/parameters.prod" : "./scripts/parameters.test"
    console.log(`Deploying with parameters: ${paramsFile}`)

    const [deployer] = await hre.ethers.getSigners()
    console.log(`Deploying with the account: ${deployer.address}`)

    const { RELEASE_TIME } = await import(paramsFile)

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
  .addParam("chunk", "Number of recipients in one chunk. Default value is 100.", 100, types.int)
  .setAction(async (args, hre) => {
    const allocations: Allocations = (await import(args.allocations)).default
    const address = args.token

    const allocation = allocations[""]
    if (!allocation || Object.keys(allocation).length === 0) {
      throw new Error("No allocations found for transferMany")
    }

    function chunk(arr: any[], size: number) {
      const result = []
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size))
      }
      return result
    }

    const recipients = Object.keys(allocation)
    const amounts = Object.values(allocation).map(i => hre.ethers.utils.parseUnits(i, "18"))

    console.log(`Calling transferMany with ${recipients.length} recipients and chunk size ${args.chunk}:`)

    const chunkedRecipients = chunk(recipients, args.chunk)
    const chunkedAmounts = chunk(amounts, args.chunk)

    console.log(`Attaching to contract ${address}...`)

    const Token = await hre.ethers.getContractFactory("ShieldToken")
    const token = await Token.attach(address)

    for (let i = 0; i < chunkedRecipients.length; i++) {
      console.log(`Chunk ${i + 1} / ${chunkedRecipients.length}:`)
      const allocationChunk = chunkedRecipients[i].reduce((obj, address, index) => ({...obj, [address]: chunkedAmounts[i][index].toString()}), {})
      console.log(allocationChunk)

      const tx = await token.transferMany(chunkedRecipients[i], chunkedAmounts[i])
      console.log(`TX Hash: ${tx.hash}`)
    }
  })

task("addAllocations", "Call addAllocations for allocations with lockup period")
  .addParam("token", "Token contract's address")
  .addParam("allocations", "JSON with allocations")
  .setAction(async (args, hre) => {
    const allocations: Allocations = (await import(args.allocations)).default
    const address = args.token

    console.log(`Attaching to contract ${address}...`)

    const Token = await hre.ethers.getContractFactory("ShieldToken")
    const token = await Token.attach(address)

    for (const [vestingTypeIndex, allocation] of Object.entries(allocations)) {
      if (!vestingTypeIndex) {
        continue
      }

      const addresses = Object.keys(allocation)
      const amounts = Object.values(allocation)
      console.log(`Calling addAllocations with "${vestingTypeIndex}" vesting type for ${addresses.length} addresses...`) // eslint-disable-line no-console
      console.log(allocation)
      const tx = await token.addAllocations(addresses, amounts, vestingTypeIndex)
      console.log(`TX Hash: ${tx.hash}\n\n`)
    }
  })

export default config
