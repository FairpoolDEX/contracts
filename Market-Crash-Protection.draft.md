# Drafts



## Technical documentation

### Usage

* Call [initialize method](#initialize-method) after deployment to activate the Shield contract.
* Call [deposit method](#deposit-method) as Trader to receive the right for compensation in future (if you think rug pull is likely).
* Call [deposit method](#deposit-method) as Protector to receive the right for premium in future (if you think rug pull is unlikely).
* Call [refund method](#refund-method) as Trader to receive the unused deposit back (if Trader side is overfunded).
* Call [refund method](#refund-method) as Protector to receive the unused deposit back (if Protector side is overfunded).
* Call [withdraw method](#withdraw-method) as Trader to receive compensation (if rug pull happens).
* Call [withdraw method](#withdraw-method) as Protector to receive premium (if rug pull doesn't happen).

#### Initialize method

Parameters:

* [Payout coefficient](#payout-coefficient)
* [Liquidity pool address](#liquidity-pool-address)
* [Deposit deadline block number](#deposit-deadline-block-number)
* [Withdraw deadline block number](#withdraw-deadline-block-number)
* [Unlock deadline block number](#unlock-deadline-block-number)

`initialize` method activates the Shield contract by providing required parameters.

#### Deposit method

Parameters:

* Is a Trader (boolean: true for Traders, false for Protectors)

`deposit` method allows the user to fund the contract. By funding the contract, the user secures the right to receive the compensation (for Traders) or premium (for Protectors) by calling the [withdraw method](#withdraw-method) later.

Notes:

* `deposit` method must be called individually by each user.
* `deposit` method can be called multiple times by each user.
* `deposit` method can be called with a different "Is a Trader" parameter by each user ([see FAQ](#faq)).
* `deposit` method must be called with some ETH (will be added to Traders fund or Protectors fund, depending on "Is a Trader" parameter).
* `deposit` method must be called before the [deposit deadline block number](#deposit-deadline-block-number) by both Traders and Protectors.

#### Withdraw method

Parameters: none

`withdraw` method allows to receive the compensation (for Traders) or premium (for Protectors) depending on [payout coefficient](#payout-coefficient).

* For Traders (if rug pull happens): `your_compensation = your_deposit * (1 + payout_coefficient)`
* For Protectors (if rug pull doesn't happen): `your_premium = your_deposit * (1 + (1 / payout_coefficient))`

Note: the formulas above are valid after [refunding](#refunding).

Notes:

* `withdraw` method must be called from the same address as the [deposit method](#deposit-method).
* `withdraw` method must be called before the [withdraw deadline block number](#withdraw-deadline-block-number) by Traders.
* `withdraw` method must be called after the [withdraw deadline block number](#withdraw-deadline-block-number) by Protectors.

##### Refund method

Parameters: none

`refund` method allows to return unused deposits back to your wallet. This becomes necessary if Traders or Protectors deposit more ETH than necessary.

Example for Traders:

* Traders deposit 10 ETH total.
* Protectors deposit 2 ETH total.
* Payout coefficient is 2.

In this case, only 1 ETH from Traders become eligible for payouts. The remaining 9 ETH are not used, and can be refunded back to Traders anytime after [deposit deadline](#deposit-deadline-block-number).

Example for Protectors:

* Traders deposit 2 ETH total.
* Protectors deposit 10 ETH total.
* Payout coefficient is 2.

In this case, only 4 ETH from Protectors become eligible for payouts. The remaining 6 ETH are not used, and can be refunded back to Protectors anytime after [deposit deadline](#deposit-deadline-block-number).

**Note:** Refunds are normal, because neither side knows how much the other side will deposit before [deposit deadline](#deposit-deadline-block-number):

* Traders don't know how much Protectors will deposit.
* Protectors don't know how much Traders will deposit.

In this case, it makes sense for every user to deposit as much as they want as soon as they decide to participate, then wait for the other side to deposit. The user who deposits first will receive the payout first. The user who deposits last can always receive a refund (if nobody else deposits on the other side).

#### Payout coefficient

Examples:

* 2 (default)
* 3
* 5

Payout coefficient is used to calculate payouts for Traders & Protectors.

If rug pull happens:

* Each trader receives `his_deposit + payout_coefficient * his_deposit`
* Each protector receives nothing.

If rug pull doesn't happen:

* Each trader receives nothing.
* Each protector receives `his_deposit + (1 / payout_coefficient) * his_deposit`.

You can also think of payout coefficient as ideal "fund ratio" = `protector_fund_size / trader_fund_size`.

Note: formulas above are applied after [refunds](#refunding)



### FAQ

**What if the user deposits 10 ETH as a Trader, then deposits 100 ETH as a Protector?**

There is no conflict:

* If rug pull happens, the user will receive his compensation as a Trader
* If rug pull doesn’t happen, the user will receive his premium as a Protector

Of course, if the user makes a double-sided deposit, he will lose some of his money anyway (because he’s betting on two exclusive outcomes at the same time, and there are other Traders / Protectors who will receive a part of one of his deposits).

### Events

* Deploy shield contract
* Deposit into shield contract as a trader
* Deposit into shield contract as a protector
* Withdraw from shield contract as a trader (if rug pull happens)
* Withdraw from shield contract as a protector (if rug pull doesn't happen)
* Rug pull (done by a malicious actor)
* Advance time past deposit deadline
* Advance time past withdraw deadline