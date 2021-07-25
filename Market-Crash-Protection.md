# Market Crash Protection

Market Crash Protection **[keeps your profits](#how-to-save-money)** safe from dumps.

Market Crash Protection is a much-needed "Stop-Loss for DeFi". It is a smart contract that gives you the right to sell a [specific token](#base-token) at a [guaranteed price](#guaranteed-price) before the [expiration date](#expiration-date). You make the final decision (sell / hold), and you fully control your funds all the time.

> **Market Crash Protection...**
>
> **... allows you to sell a specific token**
>
> **... at a guaranteed price**
>
> **... before the expiration date.**

Are you a trader? Learn more in our [guides for traders](#guides-for-traders).

Are you a liquidity provider? Check out [guides for liquidity providers](#guides-for-liquidity-providers).

## Contents

1. [Overview](#overview)
1. [How it works](#how-it-works)
1. [Guides for traders](#guides-for-traders)
    1. [How to save money](#how-to-save-money)
    1. [How to buy protection](#how-to-buy-protection)
    1. [How to buy protection for the whole portfolio](#how-to-buy-protection-for-the-whole-portfolio)
    1. [How to receive compensation](#how-to-receive-compensation)
1. [Guides for liquidity providers](#guides-for-liquidity-providers)
    1. [How to make money](#how-to-make-money)
    1. [How to deposit](#how-to-deposit)
    1. [How to withdraw](#how-to-withdraw)

## Overview

**For traders:** Market Crash Protection guarantees the price at which you can sell the token. If the market price goes below the guaranteed price, you can sell the token to the Market Crash Protection contract at the guaranteed price & save money. Learn more in our [guides for traders](#guides-for-traders).

**For liquidity providers:** Market Crash Protection allows you to earn [premium](#premium) for selling protection to [traders](#trader). Learn about the risks & benefits in our [guides for liquidity providers](#guides-for-liquidity-providers).

## How it works

### General

Market Crash Protection is a smart contract that allows traders to buy protection from liquidity providers. It works like a specialized exchange for put options. It requires the trades to happen on-chain, but allows the orders to be placed off-chain (to enable scaling & minimize transaction costs).

1. [Liquidity provider](#liquidity-provider) places an order to sell protection:
    1. Order is placed off-chain, so that LP doesn't need to pay for transaction.
    1. Order is placed via REST API, so that LP can automate the process.
1. [Trader](#trader) opens the application.
1. [Trader](#trader) finds a suitable protection via UI.
1. [Trader](#trader) sends a transaction to buy the protection.
    1. Smart contract takes [premium](#premium) from trader.
1. [Liquidity provider](#liquidity-provider) sends a transaction to sell the protection.
    1. Smart contract takes [collateral](#collateral) from liquidity provider.
    1. Smart contract gives [premium](#premium) to liquidity provider.
1. Both wait until the [expiration date](#expiration-date):
    1. If the token's [market price](#market-price) stays above the [guaranteed price](#guaranteed-price):
        1. Trader keep his [base tokens](#base-token).
        1. Liquidity provider withdraws his [quote tokens](#quote-token) from MCP contract.
    1. If the token's [market price](#market-price) goes below the [guaranteed price](#guaranteed-price):
        1. Trader sell [base tokens](#base-token) for [quote tokens](#quote-token) via [MCP contract](#market-crash-protection-contract).
        1. Liquidity provider withdraws [base tokens](#base-token) from MCP contract.

[Trader](#trader) can cancel his order & get his money back after certain timeout (by default: 6 hours), but only if the [liquidity provider](#liquidity-provider) doesn't sell protection before the trader cancels. 

Trader can't sell [base tokens](#base-token) after the expiration date.

### Developer example

The contract needs to be deployed by the developer before it can be used.

1. Developer deploys a [Market Crash Protection contract](#market-crash-protection-contract).
1. Developer initializes the Market Crash Protection contract:
    1. Developer sets a token pair (used to determine the price).
    1. Developer sets a guaranteed price (if it goes below, traders will be compensated).
    1. Developer sets an expiration date (used to lock liquidity).
    1. Developer sets a [Yearn yVault](#yearn-yvault) address (used to provide [Super-Yield](#super-yield)).

### Trader example

1. Trader buys [base tokens](#base-token).
1. Trader buys protection that cover these base tokens.
1. Base tokens' [market price](#market-price) drops below the [guaranteed price](#guaranteed-price).
1. Trader sends tokens to [MCP contract](#market-crash-protection-contract).
1. Trader receives [quote tokens](#quote-token) in amount equal to `guaranteed_price * base_token_amount`

Note: the quote tokens compensation is larger than the trader would receive if he simply sold the base tokens at market, because the guaranteed price is higher than market price after the crash.

### Liquidity provider example

1. Liquidity provider deposits [quote tokens](#quote-token) into [MCP contract](#market-crash-protection-contract).
1. Liquidity provider sells protection + Trader buys protection.
1. [Base token](#base-token) [market price](#market-price) stays above the [guaranteed price](#guaranteed-price) (trader doesn't sell).
1. [Expiration date](#expiration-date) passes (liquidity provider can withdraw).
1. Liquidity provider withdraws [quote tokens](#quote-token) + keeps the [premium](#premium) from selling protection + receives [Super-Yield](#super-yield).

## Guides for traders

### How to save money

You can save money with Market Crash Protection contracts. They give you the right to sell your tokens at a guaranteed price even if the market price has crashed.

Suppose you bought 1000 LINK tokens at 40 USDT each (total spend: 40000 USDT). After that LINK crashed to 10 USDT (4x drop). If you don't have any protection, you have to bear the loss. But let's say you bought protection that allows you to sell 1000 LINK at 30 USDT each. In this case, you can sell your LINK tokens at a guaranteed price (30 USDT) instead of market price (10 USDT). So, you can recover 30000 USDT instead of 10000 USDT. That means you can save 20000 USDT.

Here is a full scenario:

1. You buy 1000 LINK tokens at 40 USDT each (total spend: 40000 USDT).
1. You buy 1000 LINK-USDT-31-AUG-2021-30.0000 at 2 USDT each (total spend: 2000 USDT)
    1. "1000 LINK-USDT-31-AUG-2021-30.0000" means "You can sell 1000 LINK tokens before 31 Aug 2021 for 30.0000 USDT each"
1. LINK-USDT price crashes to 10 USDT before 31 Aug 2021.
1. You sell 1000 LINK tokens to [MCP contract](#market-crash-protection-contract) for 30 USDT each (total gain: 30000 USDT)

Protection allows you to recover capital. Using the example above:

* With protection, you would have 28000 USDT (30000 USDT recovered capital - 2000 USDT protection cost) (LINK crashed to 10 USDT, but you sold at 30 USDT guaranteed price using protection).
* Without protection: you would have 10000 USDT (10000 USDT recovered capital) (LINK crashed to 10 USDT, and you sold at market price).

### How to buy protection

*Note: Market Crash Protection is still under development. The guide below is how it's supposed to work.*

1. Open the Shield Finance web application.
1. Click "Buy protection".
1. Choose the [base token](#base-token) (for example: a token that you've already bought, or a token that you want to buy).
1. Browse through the list of available [Market Crash Protection contracts](#market-crash-protection-contract) for your [base token](#base-token).
    1. There will be multiple protection contracts for a single token.
    1. The contracts will have different parameters: guaranteed price & expiration date.
1. Choose the protection contract that suits your needs:
    1. If you want to buy protection for long term, choose a contract with an expiration date that is far in future.
    1. If you want to buy protection for short term, choose a contract with an expiration date that is closer to present moment.
1. Click "Buy" button on the contract that you've chosen.
1. Type how much [base tokens](#base-token) you want to protect.
1. Confirm the total cost of buying protection for this amount of base tokens.
1. Click "Buy".
    1. The app will generate a blockchain transaction.
1. Sign the transaction.

That's it! Once the transaction is confirmed, you will own the protection & you can use it to [receive compensation](#how-to-receive-compensation) if the price of the [base token](#base-token) crashes.

### How to buy protection for the whole portfolio

[Portfolio Insurance](https://shield-finance.medium.com/portfolio-insurance-with-market-crash-protection-691b652075a) allows you to save time by purchasing protection for the whole portfolio at once. It works by executing multiple orders within a single blockchain transaction.

Technical detail: the portfolio insurance transaction calls a `reserveMany` method of a router contract, passing arguments for multiple orders. The `reserveMany` method loops over orders: for each order call a `reserve` method of a regular MCP contract.

1. Open the Shield Finance web application.
1. Click "Buy protection for portfolio".
1. Input your address where you hold the tokens.
    1. Note: if you have already connected your wallet to Shield Finance web application, the input will be prefilled with the address that is currently selected in the wallet.
1. Click "Analyze".
1. Wait until our web application:
   1. Downloads a list of tokens on your address (we use only publicly available information from blockchain).
   1. Downloads a list of available insurances for your tokens.
   1. Shows a list of best matching insurances for your tokens.
   1. Shows a total price for protecting your portfolio.
1. Click "Buy protection for portfolio"
   1. The app will generate a blockchain transaction.
1. Sign the transaction.

That's it! Once the transaction is confirmed, you will own the protection for each token & you can use it to [receive compensation](#how-to-receive-compensation) if the price of any of the [base token](#base-token) crashes.

### How to receive compensation

1. Open the Shield Finance web application.
1. Click "Get compensation".
1. Browse through the list of [base tokens](#base-token) that you can get compensation for.
    1. App shows you only those tokens that are stored on the currently selected address. If you used a different address when you bought the protection, please change the currently selected address in your wallet.
    1. App shows whether the [market price](#market-price) is below the [guaranteed price](#guaranteed-price). Technically, you can sell into [MCP contract](#market-crash-protection-contract) at any point in time (even if the market price is above the guaranteed price), but it makes economic sense to sell into [MCP contract](#market-crash-protection-contract) only if the market price is below the guaranteed price.
1. Choose the token that you want to sell.
1. Choose the amount of tokens that you want to sell.
1. Click "Sell".
1. Sign the transaction.

That's it! Once the transaction is confirmed, you will receive the compensation in [quote tokens](#quote-token).

## Guides for liquidity providers

### How to make money

You can make money with [Market Crash Protection contracts](#market-crash-protection-contract) by selling protection to traders.

Suppose you believe that LINK price will not crash below 10 USDT on or before 31 Aug 2021. You can put USDT into an [MCP contract](#market-crash-protection-contract) that provides protection for LINK-USDT pair with a guaranteed price of 10 USDT and expiration date of 31 Aug 2021. When you put USDT, you can specify the [protection price](#protection-price) for each protection unit. Each protection unit will give the trader the right to sell 1 LINK into [MCP contract](#market-crash-protection-contract) at a guaranteed price of 10 USDT on or before 31 Aug 2021.

In addition, you can make more money by enabling [Super-Yield](#super-yield). It allows you to forward liquidity to [Yearn yVaults](#yearn-yvault), so that your capital continues to earn yield. Guide: [How to earn Super-Yield](#how-to-earn-super-yield).

Here is a full scenario:

1. You put money into LINK-USDT contract:
   1. [Quote amount](#quote-token-amount): 20000 USDT.
   1. [Guaranteed price](#guaranteed-price): 10 USDT per 1 LINK (how much you will give for 1 token when trader sells tokens).
   1. [Protection price](#protection-price): 1 USDT per 1 LINK (how much you will receive for 1 token when trader buys protection - no matter whether trader sells in future or not).
   1. [Expiration date](#expiration-date): 31 Aug 2021 (note: your money are locked until this date, but you can use [Super-Yield](#super-yield) to continue earning during that time).
1. You receive 2000 protection units (20000 USDT deposit / 10.0000 [guaranteed price](#guaranteed-price)).
    1. Each protection unit gives the right to sell 1 LINK for 10 USDT on or before 31 Aug 2021.
    1. Protection units are divisible (for example, you can use 0.5 protection units).
1. You sell 2000 protection units for 2000 USDT total (10% premium on 20000 USDT deposit until 31 Aug 2021 = 40% premium per year, equivalent to 40% APY).
1. You enable [Super-Yield](#super-yield) and forward 20000 USDT to a [Yearn yVault](#yearn-yvault) that provides 30% APY in addition to premium (70% APY total).
1. You wait until 31 Aug 2021.
1. You withdraw from [MCP contract](#market-crash-protection-contract).
1. You gain:
    1. 1500 USDT yield from Yearn.
    1. 2000 USDT premium from traders for selling protection.
    1. 20000 USDT or 2000 LINK liquidity:
        1. If LINK-USDT [market price](#market-price) stays above 10.0000 [guaranteed price](#guaranteed-price), the traders will not sell LINK for USDT. You will receive 20000 USDT.
        1. If LINK-USDT [market price](#market-price) falls below 10.0000 [guaranteed price](#guaranteed-price), the traders will sell LINK for USDT. You will receive 2000 LINK.

### How to earn Super-Yield

Read about [Super-Yield](#super-yield).

1. Deposit [quote tokens](#quote-token) into a [Market Crash Protection contract](#market-crash-protection-contract) (guide: [How to make money](#how-to-make-money)).
1. Click "Enable Super-Yield" in the [Market Crash Protection contract](#market-crash-protection-contract).
1. Sign the transaction.

That's it! You will start earning yield from the [Yearn yVault](#yearn-yvault) as soon as the transaction is confirmed.

### How to deposit

*Note: Market Crash Protection is still under development. The guide below is how it's supposed to work.*

1. Open the Shield Finance web application.
1. Find the [Market Crash Protection contract](#market-crash-protection-contract) that you want to deposit into.
    1. You can filter by [base token](#base-token), [quote token](#quote-token), [guaranteed price](#guaranteed-price), [expiration date](#expiration-date).
1. Click "Deposit".
1. Choose how many [quote tokens](#quote-token) you want to deposit.
1. Click "Confirm".
1. Sign the transaction.

That's it! After the transaction is confirmed, you will have a protection offer in our contract. The traders can buy protection from you at the price that you have specified. Also, don't forget to [enable Super-Yield](#how-to-earn-super-yield)!

### How to withdraw

*Note: Market Crash Protection is still under development. The guide below is how it's supposed to work.*

Note: you can only withdraw after the [expiration date](#expiration-date).

1. Open the Shield Finance web application.
1. Click "My deposits"
1. Find the [Market Crash Protection contract](#market-crash-protection-contract) that you want to withdraw from.
1. Click "Withdraw".
1. Sign the transaction.

That's it! After the transaction is confirmed, you will receive a mix of [base tokens](#base-token) and [quote tokens](#quote-token) (read [How to make money](#how-to-make-money) to figure out how much of each token you will receive). Also, if you [enabled Super-Yield](#how-to-earn-super-yield), you will receive yield.

## System tests

1. Must allow traders to sell the token at the guaranteed price.
1. Must allow traders to withdraw compensation as soon as they want.
1. Must allow protectors to sell the protection at any price.
1. Must allow protectors to withdraw liquidity after expiration date.
1. Must allow protectors to super-yield the liquidity into other projects.
1. Must not allow protectors to back out of their promise to buy at the guaranteed price.

## Definitions

### Market Crash Protection contract

Market Crash Protection contract (MCP contract) is a smart contract with the following features:

* Allows traders to receive compensation if the market price goes below the [guaranteed price](#guaranteed-price).
* Allows liquidity providers to receive premiums by selling protection to traders.

Reference implementation: [MCP.sol](./contracts/MCP.sol)

### Developer

Developer is a person that writes & deploys smart contracts.

In case of [MCP contracts](#market-crash-protection-contract), developer can be any technical employee of Shield Finance.

### Liquidity provider

Liquidity provider is a person who puts [quote tokens](#quote-token) into the [Market Crash Protection contracts](#market-crash-protection-contract) to earn [premium](#premium) and [Super-Yield](#super-yield).

Liquidity provider wants to minimize the risk of losing money (by comparison, a [trader](#trader) wants to maximize the chance of making money).

Notes:

* Liquidity provider can [earn premium](#how-to-make-money).
* Liquidity provider can [earn Super-Yield](#how-to-earn-super-yield).
* Liquidity provider will make more money if the [market price](#market-price) stays above [guaranteed price](#guaranteed-price) before the [expiration date](#expiration-date).
* Liquidity provider should use the following methods of the [MCP contract](#market-crash-protection-contract):
  * [Deposit method](#deposit-method)
  * [Withdraw method](#withdraw-method)

### Trader

Trader is a person who buys protection and, optionally, sells the [base tokens](#base-token) into the [Market Crash Protection contract](#market-crash-protection-contract).

Trader wants to maximize the chance of making money (by comparison, a [liquidity provider](#liquidity-provider) wants to minimize the risk of losing money).

Notes:

1. Trader needs to buy protection in order to sell the [base tokens](#base-token) into [MCP contract](#market-crash-protection-contract).
1. Trader should use the following methods of the [MCP contract](#market-crash-protection-contract):
    * [Sell method](#sell-method)

### Market price

Market price is a decimal number that represents the highest bid price at which you can sell the [base token](#base-token) for [quote token](#quote-token) on the open market. For example: "The market price of ETH is 3000 USDT".

Examples:

* 20.0
* 40.45
* 10000.0

Notes:

* Different markets may have different prices. For example, Binance ETHUSDT market may have a market price of 3000, while Uniswap ETHUSDT market may have a market price of 3010.

### Guaranteed price

Guaranteed price is a decimal number that represents the price at which you can sell the [base token](#base-token) into the [MCP contract](#market-crash-protection-contract). See "[How to save money](#how-to-save-money)".

Examples:

* 20.0
* 40.45
* 10000.0

Notes:

* Guaranteed price is a parameter of [Market Crash Protection contract](#market-crash-protection-contract).
* Guaranteed price is set at the time of deployment of [Market Crash Protection contract](#market-crash-protection-contract).
* Guaranteed price does not change after deployment.
* A single [MCP contract](#market-crash-protection-contract) can specify a single guaranteed price.
* It is possible to deploy multiple [MCP contracts](#market-crash-protection-contract) for different guaranteed prices.

### Protection price

Protection price is a decimal number that represents the price at which you can buy the protection for 1 unit of [base token](#base-token) from the [MCP contract](#market-crash-protection-contract). See "[How to save money](#how-to-save-money)".

Examples:

* 0.25
* 1.0
* 10.0

Notes:

* Liquidity providers set the protection price when they deposit [quote tokens](#quote-token) into the [MCP contract](#market-crash-protection-contract).

### Guaranteed amount

Guaranteed amount is a decimal number that represents the amount of [base tokens](#base-token) under protection.

When the trader uses protection, he sells "guaranteed amount" of base tokens.

Examples:

* 100.0
* 4000.0
* 7500.145

### Expiration date

Expiration date is a UNIX timestamp that is used to limit the usage of a specific [Market Crash Protection contract](#market-crash-protection-contract).

* [Trader](#trader) can [sell base token](#sell-method) into [MCP contract](#market-crash-protection-contract) only before the expiration date.
* [Liquidity provider](#liquidity-provider) can [withdraw liquidity](#withdraw-method) from [MCP contract](#market-crash-protection-contract) only after the expiration date.

### Premium

Premium is money earned by liquidity providers by selling protection to traders.

Premium is the first source of income for liquidity providers ([Super-Yield](#super-yield) is the second source).

Premium is calculated as [guaranteed amount](#guaranteed-amount) multiplied by [protection price](#protection-price).

Notes:

* Liquidity providers can set any protection price.
* Liquidity providers can change the protection price.
* The actual price of protection will be determined by market forces. If the traders are expecting a market crash, they will buy protection at a relatively higher price (compared to a situation where they are not expecting a market crash).

### Collateral

Collateral is money deposited by liquidity providers into MCP that is used to pay the [trader](#trader) if he decides to use the protection.

Collateral is calculated as [guaranteed amount](#guaranteed-amount) multiplied by [guaranteed price](#guaranteed-price).

Notes:

* Liquidity providers can set any protection price.
* Liquidity providers can change the protection price.
* The actual price of protection will be determined by market forces. If the traders are expecting a market crash, they will buy protection at a relatively higher price (compared to a situation where they are not expecting a market crash).

### Base token

Base token is the first token in a pair. In a LINK-USDT pair, LINK is the base token. Base token is normally more volatile than quote token.

Examples:

* LINK
* AAVE
* COMP

Notes:

* The distinction between base & quote tokens is by convention. Normally, a less stable token is "base" & more stable token is "quote".

### Quote token

Quote token is the second token in a pair. In a LINK-USDT pair, USDT is the quote token. Quote token is normally less volatile than base token.

Examples:

* WETH
* WBTC
* USDT

### Pair

Pair is two tokens that can be traded for each other.

Examples:

* LINK-USDT
* LINK-ETH
* ETH-USDT

### Yearn yVault

Yearn yVault is a smart contract that allows the liquidity providers to earn yield via automated strategy. Yearn yVault saves time for liquidity providers by managing their funds automatically, but it also takes a performance fee for this service.

Liquidity providers can forward the liquidity from [MCP contracts](#market-crash-protection-contract) to Yearn yVaults to earn [Super-Yield](#super-yield).

More information: [Yearn Vaults list](https://yearn.finance/vaults)

### Base token address

Base token address is a string that is the [base token](#base-token) smart contract address.

Examples:

* 0x514910771af9ca656af840dff83e8264ecf986ca - [ChainLink Token (LINK)](https://etherscan.io/address/0x514910771af9ca656af840dff83e8264ecf986ca)
* 0x2f109021afe75b949429fe30523ee7c0d5b27207 - [AAVE Token (AAVE)](https://etherscan.io/address/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9)
* 0xc00e94cb662c3520282e6f5717214004a7f26888 - [Compound Token (COMP)](https://etherscan.io/address/0xc00e94cb662c3520282e6f5717214004a7f26888)

### Quote token address

Quote token address is a string that is the [quote token](#quote-token) smart contract address.

Examples:

* 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 - [Wrapped Ether (WETH)](https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)
* 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 - [Wrapped Bitcoin (WBTC)](https://etherscan.io/address/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599)
* 0xdac17f958d2ee523a2206206994597c13d831ec7 - [Tether (USDT)](https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7)

### Liquidity pool address

Examples:

* 0xa7e6b2ce535b83e82ab598e9e432705f8d7ce929 - [CHT-ETH pool on Uniswap](https://info.uniswap.org/token/0xa7e6b2ce535b83e82ab598e9e432705f8d7ce929)
* 0xd3d2e2692501a5c9ca623199d38826e513033a17 - [UNI-ETH pool on Uniswap](https://info.uniswap.org/pair/0xd3d2e2692501a5c9ca623199d38826e513033a17)
* 0x795065dcc9f64b5614c407a6efdc400da6221fb0 - [SUSHI-ETH pool on Sushiswap](https://www.sushiswap.fi/pair/0x795065dcc9f64b5614c407a6efdc400da6221fb0)

### Yearn yVault address

Examples:

* 0xc695f73c1862e050059367B2E64489E66c525983 - [yvBOOST - ETH Yearn yVault](https://etherscan.io/address/0xc695f73c1862e050059367B2E64489E66c525983)
* 0x27b7b1ad7288079A66d12350c828D3C00A6F07d7 - [crvIB Yearn yVault](https://etherscan.io/address/0x27b7b1ad7288079A66d12350c828D3C00A6F07d7)
* 0x625b7DF2fa8aBe21B0A976736CDa4775523aeD1E - [crvHBTC Yearn yVault](https://etherscan.io/address/0x625b7DF2fa8aBe21B0A976736CDa4775523aeD1E)

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
