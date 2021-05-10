# Market Crash Protection

Market Crash Protection **[keeps your profits](#how-to-save-money)** safe from dumps.

Market Crash Protection is a much-needed "Stop-Loss for DeFi". It is a smart contract that gives you the right to sell a specific token at a guaranteed price before the expiration date. You make the final decision (sell / hold), and you fully control your funds all the time.

> **Market Crash Protection...**
>
> **... allows you to sell a specific token**
>
> **... at a guaranteed price**
>
> **... before the expiration date.**

Are you a liquidity provider? **[Learn about Super-Yield](#how-to-earn-super-yield)**.

## Overview

**For traders:** Market Crash Protection guarantees the price at which you can sell the token. If the market price goes below the guaranteed price, you can sell the token to the Market Crash Protection contract at the guaranteed price & save money. Learn more in our [guides for traders](#guides-for-traders).

**For liquidity providers:** Market Crash Protection provides 2 ways to make money: 1) by selling "[protection tokens](#protection-token)" to traders 2) by earning [super-yield](#super-yield). Learn about the risks & benefits in our [guides for liquidity providers](#guides-for-liquidity-providers).

## How it works

### General

1. Liquidity providers deposit funds into the contract.
1. Liquidity providers receive "protection tokens".
1. Liquidity providers sell "protection tokens" to traders.
1. If the token pair price goes below the guaranteed price: traders can sell by sending the original tokens to the contract (the "protection tokens" will be burned; traders need to hold "protection tokens" on the same address as the original tokens).

### Developer perspective

The contract needs to be deployed by the developer before it can be used.

1. Developer deploys a Market Crash Protection contract.
1. Developer initializes the Market Crash Protection  contract:
    1. Developer sets a token pair (used to determine the price).
    1. Developer sets a guaranteed price (if it goes below, traders will be compensated).
    1. Developer sets an expiration date (used to lock liquidity).

### Trader perspective

1. Trader buys protection.
1. Token price drops below the guaranteed price.
1. Trader sends tokens to our contract.
1. Trader receives a compensation equal to `guaranteed_price * token_amount`

Note: the compensation is larger than the trader would receive if he simply sold the tokens at market, because the guaranteed price is higher than market price after the crash.

### Liquidity provider receives a premium

1. Liquidity provider deposits funds into our contract.
1. Liquidity provider sells protection.
1. Token price stays above the guaranteed price (trader doesn't sell).
1. Expiration date passes (liquidity provider can withdraw).
1. Liquidity provider withdraws funds + keeps the premium from selling protection.

## Technical specification

### System tests

1. Must allow traders to sell the token at the guaranteed price.
1. Must allow traders to withdraw compensation as soon as they want.
1. Must allow protectors to sell the protection at any price.
1. Must allow protectors to withdraw liquidity after expiration date.
1. Must allow protectors to super-yield the liquidity into other projects.
1. Must not allow protectors to back out of their promise to buy at the guaranteed price.

### Deployment

* Anybody can deploy a new MCP contract.
* Anybody can call public methods of a new MCP contract.

## Guides for traders

### How to save money

You can save money with Market Crash Protection contracts. They give you the right to sell your tokens at a guaranteed price even if the market price has crashed.

Suppose you bought 1000 LINK tokens at 40 USDT each (total spend: 40000 USDT). After that LINK crashed to 10 USDT (4x drop). If you don't have any [protection tokens](#protection-token), you have to bear the loss. But let's say you bought 1000 LINK protection tokens that allow you to sell 1000 LINK at 30 USDT each. In this case, you can sell your LINK tokens at a guaranteed price (30 USDT) instead of market price (10 USDT). So, you can recover 30000 USDT instead of 10000 USDT. That means you can save 20000 USDT.

Here is a full scenario:

* You buy 1000 LINK tokens at 40 USDT each (total spend: 40000 USDT).
* You buy 1000 LINK-USDT-31-AUG-2021-30.0000 at 2 USDT each (total spend: 2000 USDT)
  * "1000 LINK-USDT-31-AUG-2021-30.0000" means "You can sell 1000 LINK tokens before 31 Aug 2021 for 30.0000 USDT each"
* LINK-USDT price crashes to 10 USDT before 31 Aug 2021.
* You sell 1000 LINK tokens to [MCP contract](#market-crash-protection-contract) for 30 USDT each (total gain: 30000 USDT)

Protection tokens allow you to recover capital. Using the example above:
* With protection, you would have 28000 USDT (30000 USDT recovered capital - 2000 USDT protection cost) (LINK crashed to 10 USDT, but you sold at 30 USDT guaranteed price using protection).
* Without protection: you would have 10000 USDT (10000 USDT recovered capital) (LINK crashed to 10 USDT, and you sold at market price).

## Guides for liquidity providers

### How to make money

You can make money with Market Crash Protection contracts. They give you the right to sell [protection tokens](#protection-token) to traders and also earn [super-yield](#super-yield).

Suppose you believe that WBTC price will never crash below 10000 USDT. 

TODO

### How to earn Super-Yield

Read about [Super-Yield](#super-yield).

TODO

### How to deposit

You can make money by depositing [quote tokens](#quote-token) into [MCP contracts](#market-crash-protection-contract). You can withdraw them after the expiration date (see [How to withdraw](#how-to-withdraw)). When you deposit quote tokens, you receive two types of tokens:

* Liquidity tokens give you the right to [withdraw](#how-to-withdraw) liquidity later.
* Protection tokens give you the right to 

TODO

### How to withdraw

TODO

## Definitions

### Market Crash Protection contract

Market Crash Protection contract (MCP contract) is a smart contract with the following features:
 
* Allows traders to receive compensation if the market price goes below the [guaranteed price](#guaranteed-price).
* Allows liquidity providers to receive premiums by selling [protection tokens](#protection-token) to traders.

Market Crash Protection contract has the following methods:

* [Initialize](#initialize-method)
* [Deposit](#deposit-method)
* [Withdraw](#withdraw-method)
* [Sell](#sell-method)

### Initialize method

Initialize method allows the [developer](#developer) to set the contract parameters.

Parameters:

* [Base token address](#base-token-address)
* [Quote token address](#quote-token-address)
* [Guaranteed price](#guaranteed-price)

### Deposit method

Deposit method allows the [liquidity providers](#liquidity-provider) to put the [quote tokens](#quote-token) into the [MCP contract](#market-crash-protection-contract).

Parameters:

* [Quote token amount](#quote-token-amount)

Effects:

* Deposits [quote token](#quote-token)
* Mints [protection token](#protection-token):
    * Address: method caller address
    * Amount: [Quote token amount](#quote-token-amount) / [Guaranteed price](#guaranteed-price)

### Withdraw method

Withdraw method allows the [liquidity providers](#liquidity-provider) to take the [base tokens](#base-token) and the [quote tokens](#quote-token) out of the [MCP contract](#market-crash-protection-contract).

The amount of base & quote tokens is calculated separately for each liquidity provider, depending on the amount of quote tokens that he / she initially deposited. See [How to deposit](#how-to-deposit), [How to withdraw](#how-to-withdraw).

Notes:

* Withdraw method can only be called after the [expiration date](#expiration-date)

### Sell method

TODO

### Developer

Developer is the person that writes & deploys smart contracts.

In case of [MCP contracts](#market-crash-protection-contract), developer can be any technical employee of Shield Finance. 

### Liquidity provider

TODO

### Trader

TODO

### Guaranteed price

Guaranteed price is a decimal number that represents the price at which you can sell the [base token](#base-token). See "[How to save money](#how-to-save-money)".

Example:
* 20.0
* 40.45
* 10000.0

### Expiration date

TODO

### Premium

Premium is money earned by liquidity providers by selling [protection tokens](#protection-token) to traders.

Premium is the first source of income for liquidity providers ([Super-Yield](#super-yield) is the second source).

Notes:

* Liquidity providers can offer protection tokens on any market at any price.
* Traders can pay for protection tokens any price depending on how much they need them.
* The actual trading price of protection tokens will be determined by market forces. If the traders are expecting a market crash, they will buy protection tokens at a relatively higher price (compared to a situation where they are not expecting a market crash).
* The first market for protection tokens must be created by the developer who deploys the [MCP contract](#market-crash-protection-contract).

### Super-Yield

Super-Yield is extra money earned by liquidity providers in addition to [premium](#premium).

Liquidity providers can earn Super-Yield by re-depositing the funds from [MCP contract](#market-crash-protection-contract) to [Yearn yVaults](https://yearn.finance/vaults). They can withdraw the funds anytime. Alternatively, a withdrawal will happen automatically at the [expiration date](#expiration-date) of the MCP contract (when a portion of the funds is used to pay the traders).

Notes:

* Liquidity providers can split the funds between multiple vaults.
* Liquidity providers can withdraw the funds from the vault if it performs poorly.
* Liquidity providers keep 100% of the yield generated by the vaults.

### Base token

Base token is a token that is traded against [quote token](#quote-token). In a LINK-USDT pair, LINK is the base token. Base token is normally more volatile than quote token.

Examples:

* LINK
* AAVE
* COMP

Notes:

* The distinction between base & quote tokens is by convention. Normally, a less stable token is "base" & more stable token is "quote". 

### Quote token

Quote token is a token that is traded for [base token](#base-token). In a LINK-USDT pair, USDT is the quote token. Quote token is normally less volatile than base token.

Examples:

* WETH
* WBTC
* USDT

### Protection token

Protection token is a token that gives the right to sell [base token](#base-token) at the [guaranteed price](#guaranteed-price) via specific [Market Crash Protection contract](#market-crash-protection-contract) and receive [quote token](#quote-token).

Examples:

* WBTC-USDT-30-JUN-2021-50000 - gives the right to sell 1 WBTC for 50000 USDT on or before June 30, 2021.
* LINK-USDT-31-AUG-2021-10.0000 - gives the right to sell 1 LINK for 10 USDT on or before July 31, 2021.
* AAVE-WETH-30-SEP-2021-0.05000 - gives the right to sell 1 AAVE for 0.05 WETH on or before September 30, 2021.

Notes:

* 1 protection token gives the right to sell 1 base token.
* You need to hold protection tokens on the same address as base tokens to exercise the right to sell.
* After you sell the base tokens into the [MCP contract](#market-crash-protection-contract), your protection tokens will be burnt at 1:1 rate (e.g. if you sell 100 LINK, the contract will burn 100 LINK protection tokens).

### Base token address

Base token address is a string that is the [base token](#base-token) smart contract address.

Examples:

* 0x514910771af9ca656af840dff83e8264ecf986ca ([ChainLink Token (LINK)](https://etherscan.io/address/0x514910771af9ca656af840dff83e8264ecf986ca))
* 0x2f109021afe75b949429fe30523ee7c0d5b27207 ([AAVE Token (AAVE)](https://etherscan.io/address/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9))
* 0xc00e94cb662c3520282e6f5717214004a7f26888 ([Compound Token (COMP)](https://etherscan.io/address/0xc00e94cb662c3520282e6f5717214004a7f26888))

### Quote token address

Quote token address is a string that is the [quote token](#quote-token) smart contract address.

Examples:

* 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 ([Wrapped Ether (WETH)](https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2))
* 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 ([Wrapped Bitcoin (WBTC)](https://etherscan.io/address/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599))
* 0xdac17f958d2ee523a2206206994597c13d831ec7 ([Tether (USDT)](https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7))

### Liquidity pool address

Examples:

* 0xa7e6b2ce535b83e82ab598e9e432705f8d7ce929 ([CHT-ETH pool on Uniswap](https://info.uniswap.org/token/0xa7e6b2ce535b83e82ab598e9e432705f8d7ce929))
* 0xd3d2e2692501a5c9ca623199d38826e513033a17 ([UNI-ETH pool on Uniswap](https://info.uniswap.org/pair/0xd3d2e2692501a5c9ca623199d38826e513033a17))
* 0x795065dcc9f64b5614c407a6efdc400da6221fb0 ([SUSHI-ETH pool on Sushiswap](https://www.sushiswap.fi/pair/0x795065dcc9f64b5614c407a6efdc400da6221fb0))

### Base token amount

Base token amount is a decimal number that represents the amount of [base token](#base-token).

Examples:

* 100.0
* 4000.0
* 7500.145

### Quote token amount

Quote token amount is a decimal number that represents the amount of [quote token](#quote-token).

Examples:

* 100.0
* 4000.0
* 7500.145
