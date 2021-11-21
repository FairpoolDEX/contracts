import { HardhatUserConfig } from "hardhat/types"
import { task, types } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@typechain/hardhat"
import "hardhat-watcher"
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import "hardhat-dependency-compiler"
import { config as dotEnvConfig } from "dotenv"
import { deployShieldToken } from "./tasks/deployShieldToken"
import { transferManyShieldToken } from "./tasks/transferManyShieldToken"
import { addAllocationsShieldToken } from "./tasks/addAllocationsShieldToken"
import { setClaimsBullToken } from "./tasks/setClaimsBullToken"
import { deployBullToken } from "./tasks/deployBullToken"
import { claimBullTokenTask } from "./tasks/claimBullToken"
import { upgradeToken } from "./tasks/upgradeToken"
import { rollbackBullTokenTask } from "./tasks/rollbackBullToken"
import { deployMCP } from "./tasks/deployMCP"
import { deployContract } from "./tasks/deployContract"
import { maxFeePerGas as gasPrice } from "./util/gas"

dotEnvConfig()

const mnemonic = process.env.MNEMONIC || ""

const etherscanApikey = process.env.ETHERSCAN_API_KEY

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      initialDate: new Date(0).toISOString(),
      gasPrice,
      gasMultiplier: 1,
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      //   blockNumber: 12779553,
      // },
      blockGasLimit: 8000000,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    localhost: {
      //   accounts: {
      //     mnemonic: process.env.MNEMONIC || "",
      //   },
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 8000000,
      timeout: 30 * 60 * 1000,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 30000000, // https://etherscan.io/blocks
      accounts: { mnemonic },
      timeout: 24 * 60 * 60 * 1000,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 8000000, // https://ropsten.etherscan.io/blocks
      accounts: { mnemonic },
      timeout: 2 * 60 * 1000,
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 85000000,
      accounts: { mnemonic },
      timeout: 24 * 60 * 60 * 1000,
    },
    bsctestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 30000000,
      accounts: { mnemonic },
      timeout: 2 * 60 * 1000,
    },
    avaxmainnet: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 8000000,
      accounts: { mnemonic },
      timeout: 24 * 60 * 60 * 1000,
    },
    avaxtestnet: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      gasPrice,
      gasMultiplier: 1.2,
      blockGasLimit: 8000000,
      accounts: { mnemonic },
      timeout: 2 * 60 * 1000,
    },
  },
  etherscan: {
    apiKey: etherscanApikey,
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
  typechain: {
    externalArtifacts: [
      "node_modules/@uniswap/v2-core/build/!(Combined-Json).json",
      "node_modules/@uniswap/v2-periphery/build/!(Combined-Json).json",
    ],
  },
  dependencyCompiler: {
    paths: [
      "@uniswap/v2-core/contracts/UniswapV2Pair.sol",
      "@uniswap/v2-core/contracts/UniswapV2Factory.sol",
      "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol",
      "@uniswap/v2-periphery/contracts/test/WETH9.sol",
    ],
    // path: `${os.tmpdir()}/hardhat-dependency-compiler`,
  },
  // paths: {
  //   // sources: "?(.|./node_modules/@uniswap/v2-core|./node_modules/@uniswap/v2-periphery)/contracts",
  //   sources: "+(./contracts)",
  // },
}

task("deployShieldToken", "Deploy ShieldToken contract")
  .setAction(deployShieldToken)

task("deployBullToken", "Deploy BullToken contract")
  .setAction(deployBullToken)

task("deployMCP", "Deploy MCP contract")
  .addParam("feeDivisorMin", "Minimal fee divisor", 100, types.int)
  .setAction(deployMCP)

task("deployContract", "Deploy a contract")
  .addParam("contract", "Contract name", undefined, types.string)
  .addOptionalParam("upgradeable", "Deploy with upgradeable proxy", false, types.boolean)
  .addOptionalParam("constructorArgsModule", "File path to a javascript module that exports the list of arguments.", undefined, types.inputFile)
  .addOptionalVariadicPositionalParam("constructorArgsParams", "Contract constructor arguments. Ignored if the --constructorArgsModule option is used.", [])
  .setAction(deployContract)

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
