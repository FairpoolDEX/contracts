import { HardhatUserConfig } from "hardhat/types"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "hardhat-watcher"
import "hardhat-typechain"
// import "hardhat-deploy"
// import 'hardhat-deploy-ethers'
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import { config as dotEnvConfig } from "dotenv"

dotEnvConfig()

// const INFURA_API_KEY = process.env.INFURA_API_KEY || ""
// const ROPSTEN_PRIVATE_KEY =
//   process.env.ROPSTEN_PRIVATE_KEY ||
//   "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3" // well known private key

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
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    // coverage: {
    //   url: "http://127.0.0.1:8555",
    // },
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
  // namedAccounts: {
  //   deployer: 0,
  // },
}

export default config
