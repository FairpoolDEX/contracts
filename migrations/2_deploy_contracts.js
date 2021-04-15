const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
require('dotenv').config();
// handle migrations
// const PaidToken = artifacts.require("PaidToken");
// const PaidTokenV2 = artifacts.require("PaidTokenV2");
const PaidTokenV3 = artifacts.require("PaidTokenV3");

//Allocation Accounts
const allocation1 = process.env.ALLOCATION_1
const allocation2 = process.env.ALLOCATION_2
const allocation3 = process.env.ALLOCATION_3
const allocation4 = process.env.ALLOCATION_4
const allocation5 = process.env.ALLOCATION_5
const allocation6 = process.env.ALLOCATION_6
const allocation7 = process.env.ALLOCATION_7
const allocation8 = process.env.ALLOCATION_8
//Allocation Amount
const amount1 = process.env.AMOUNT_1
const amount2 = process.env.AMOUNT_2
const amount3 = process.env.AMOUNT_3
const amount4 = process.env.AMOUNT_4
const amount5 = process.env.AMOUNT_5
const amount6 = process.env.AMOUNT_6
const amount7 = process.env.AMOUNT_7
const amount8 = process.env.AMOUNT_8

//Initial Mint Account
const account1 = process.env.ACCOUNT_1
const account2 = process.env.ACCOUNT_2
const account3 = process.env.ACCOUNT_3

module.exports = async function (deployer) {
// @TODO: The three types of migrations to be carried out are placed, two in testnet,
// to test the complete deployment and update cycle, and then only one in mainnet,
// since it is the one that will be carried out definitively

// Testnet Approach Stage #1
const instance = await deployProxy(PaidTokenV3, [], { deployer });
await instance.pause(true);


  // Mainnet Approach Stage #2
  // const instance = await deployProxy(PaidTokenV3, [account1, account2, account3], { deployer });

  // const wallets = [
  //   allocation1,
  //   allocation2,
  //   allocation3,
  //   allocation4,
  //   allocation5,
  //   allocation6,
  //   allocation7,
  //   allocation8
  // ]

  // for (const i in wallets) {
	// 	console.log(wallets[i]);
  //   await instance.addAllocations([wallets[i]], ['1000000000000000000000000'], i.toString());
  // }

  // await instance.addAllocations(['allocation1'], ['amount1'], '0'); // 30 Days 1.66 Percent
  // await instance.addAllocations(['allocation2'], ['amount2'], '1'); // 180 Days 1.66 Percent
  // await instance.addAllocations(['allocation3'], ['amount3'], '2'); // 360 Days 4.66 Percent
  // await instance.addAllocations(['allocation4'], ['amount4'], '3'); // 30 Days 4.66 Percent
  // await instance.addAllocations(['allocation5'], ['amount5'], '4'); // 0 Days 100 Percent
  // await instance.addAllocations(['allocation6'], ['amount6'], '5'); // 30 Days 11.11 Percent
  // await instance.addAllocations(['allocation7'], ['amount7'], '6'); // 0 Days 10 initial 15 monthly Percent
  // await instance.addAllocations(['allocation8'], ['amount8'], '7'); // 0 Days 25 initial 25 monthly Percent
};
