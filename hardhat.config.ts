import { HardhatUserConfig } from "hardhat/types"
import { task, types } from "hardhat/config"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "hardhat-watcher"
import "hardhat-typechain"
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import { config as dotEnvConfig } from "dotenv"
import { deployShieldToken } from "./tasks/deployShieldToken"
import { transferManyShieldToken } from "./tasks/transferManyShieldToken"
import { addAllocationsShieldToken } from "./tasks/addAllocationsShieldToken"
import { setClaimsBullToken } from "./tasks/setClaimsBullToken"
import { deployBullToken } from "./tasks/deployBullToken"

dotEnvConfig()

const gasPrice: number = 20 * 1000000000

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
    hardhat: {
      gasMultiplier: 1.2,
    },
    // localhost: {
    //   accounts: {
    //     mnemonic: process.env.MNEMONIC || "",
    //   },
    // },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice,
      gasMultiplier: 1.2,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      timeout: 24 * 60 * 60 * 1000,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice,
      gasMultiplier: 1.2,
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

task("deployShieldToken", "Deploy ShieldToken contract")
  .setAction(deployShieldToken)

task("deployBullToken", "Deploy BullToken contract")
  .setAction(deployBullToken)

task("transferMany", "Call transferMany for allocations without lockup period")
  .addParam("token", "Token contract's address")
  .addParam("allocations", "JSON with allocations")
  .addParam("chunk", "Number of recipients in one chunk. Default value is 100.", 100, types.int)
  .setAction(transferManyShieldToken)

task("addAllocations", "Call addAllocations for allocations with lockup period")
  .addParam("token", "Token contract's address")
  .addParam("allocations", "JSON with allocations")
  .setAction(addAllocationsShieldToken)

task("setClaims", "Call setClaims on BULL token contract")
  .addParam("token", "Token contract's address")
  .addParam("balances", "CSV with SHLD balances exported from Etherscan")
  .addParam("extras", "CSV with SHLD balances calculated from locked liquidity")
  .addParam("olds", "CSV with SHLD balances for setting to 0 (from previous stages)")
  .setAction(setClaimsBullToken)

export default config
