import { HardhatUserConfig } from "hardhat/types"
import { task, types } from "hardhat/config"
import '@nomiclabs/hardhat-ethers'
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@typechain/hardhat"
import "hardhat-watcher"
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import { config as dotEnvConfig } from "dotenv"
import { deployShieldToken } from "./tasks/deployShieldToken"
import { transferManyShieldToken } from "./tasks/transferManyShieldToken"
import { addAllocationsShieldToken } from "./tasks/addAllocationsShieldToken"
import { setClaimsBullToken } from "./tasks/setClaimsBullToken"
import { deployBullToken } from "./tasks/deployBullToken"
import { claimBullToken, claimBullTokenTask } from "./tasks/claimBullToken"
import { upgradeToken } from "./tasks/upgradeToken"
import { date } from "./util/addParamTypes"
import { rollbackBullTokenTask } from "./tasks/rollbackBullToken"
import { deployMCP } from "./tasks/deployMCP"

dotEnvConfig()

const gasPriceInGwei = parseInt(process.env.GAS_PRICE || "0", 10)
if (gasPriceInGwei) {
  console.info(`[INFO] Setting gas price to ${gasPriceInGwei} gwei`)
} else {
  console.error(`
[ERROR] GAS_PRICE environment variable must be set to the number in gwei.

Example for 20 gwei:
GAS_PRICE=20 [hardhat command]
  `.trim())
  process.exit(1)
}
const gasPrice: number = gasPriceInGwei * 1000000000

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
      initialDate: new Date(0).toISOString(),
      gasMultiplier: 1.2,
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      //   blockNumber: 12779553,
      // },
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    localhost: {
    //   accounts: {
    //     mnemonic: process.env.MNEMONIC || "",
    //   },
      timeout: 30 * 60 * 1000,
    },
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
      timeout: 2 * 60 * 1000,
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
  // typechain: {
  //   // @ts-ignore
  //   externalArtifacts: ['node_modules/@uniswap/v2-core/build/*.json'],
  // },
}

task("deployShieldToken", "Deploy ShieldToken contract")
  .setAction(deployShieldToken)

task("deployBullToken", "Deploy BullToken contract")
  .setAction(deployBullToken)

task("deployMCP", "Deploy MCP contract")
  .addParam("feeDivisorMin", "Minimal fee divisor", 100, types.int)
  .setAction(deployMCP)

task("transferMany", "Call transferMany for allocations without lockup period")
  .addParam("token", "SHLD token contract address")
  .addParam("allocations", "JSON with allocations")
  .addParam("chunk", "Number of recipients in one chunk. Default value is 100.", 100, types.int)
  .setAction(transferManyShieldToken)

task("addAllocations", "Call addAllocations() for allocations with lockup period")
  .addParam("token", "SHLD token contract address")
  .addParam("allocations", "JSON with allocations")
  .setAction(addAllocationsShieldToken)

task("setClaims", "Call setClaims() on BULL token contract")
  .addParam("dry", "Dry-run: display planned actions but don't execute them", false, types.boolean, true)
  .addParam("token", "BULL token contract address", "", types.string)
  .addParam("nextfolder", "Folder with CSV files containing next SHLD balances (mult by 3)", "", types.string)
  .addParam("prevfolder", "Folder with CSV files containing prev SHLD balances (to set their claims to 0 if they don't hold SHLD anymore)", "", types.string)
  .addParam("retrofolder", "Folder with CSV files containing next SHLD balances (mult by 1)", "", types.string)
  .addParam("blacklistfolder", "Folder with CSV files containing blacklist SHLD balances (to set their claims to 0 always)", "", types.string)
  .addParam("expectations", "JSON file with test expectations")
  .setAction(setClaimsBullToken)

task("claim", "Call claim() on BULL token contract")
  .addParam("token", "BULL token contract address")
  .addParam("claimer", "Claim transaction sender address")
  .addParam("claims", "CSV file with addresses")
  .setAction(claimBullTokenTask)

task("rollback", "Change the balances of BullToken back to certain date")
  .addParam("dry", "Dry-run: display planned actions but don't execute them", false, types.boolean, true)
  .addParam("token", "BULL token contract address")
  .addParam("from", "From block number", undefined, types.int, false)
  .addParam("to", "To block number", undefined, types.int, false)
  .addParam("pools", "BULL token Uniswap pools addresses (comma-separated)")
  .addParam("holders", "CSV file with token holder addresses")
  .addParam("expectations", "JSON file with test expectations")
  .setAction(rollbackBullTokenTask)

task("upgradeToken", "Upgrade a token contract")
  .addParam("name", "Contract name")
  .addParam("address", "Contract proxy address")
  .setAction(upgradeToken)

export default config
