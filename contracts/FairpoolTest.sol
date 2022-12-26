// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Fairpool.sol";

// TODO: Test existence: increasing speed decreases baseDelta, it's possible to arrive back at the same state if msg.sender is operator
// TODO: -4320273083666300421
contract FairpoolTest is Fairpool, Util {
    address payable[] $beneficiaries;
    uint[] $shares;
    uint constant $speed = maxSpeed;
    uint constant $fees = scale * 25 / 1000;
    uint constant $royalties = scale / 2 - $fees;
    uint constant $dividends = scale / 2 - 1;

    constructor() Fairpool("FairpoolTest", "FTS", $speed, $royalties, $dividends, $beneficiaries, $shares) {
        // speed and tax can be changed via reset()
        // beneficiaries and shares can be changed via transferShares()
        operator = payable(msg.sender); // allow the owner to receive the fees & call setOperator()
        setTaxesInternal($royalties, $dividends, $fees);
    }

    // msg.value is bounded by native currency supply
    function test() public {
        speedIsBounded();
        taxIsBounded();
        allUsersHaveTallies();
        contractBalanceIsCorrect();
    }

    // allow testing different combinations of speed, royalties, dividends
    function reset(uint speed_, uint royalties_, uint dividends_) public onlyOwner {
        for (uint i = 0; i < holders.length; i++) {
            _burn(holders[i], balanceOf(holders[i]));
            delete tallies[holders[i]];
        }
        payable(owner()).transfer(address(this).balance);
        setSpeedInternal(speed_);
        setTaxesInternal(royalties_, dividends_, fees);
    }

    // Using a struct to avoid the "stack too deep" error
    struct Vars {
        uint balanceOfContract;
        uint balanceOfContractCached;
        uint balanceOfContractCalculated;
        uint baseBalanceOfSender;
        uint quoteBalanceOfSender;
        uint quoteBalanceOfOperator;
        uint tallyOfSender;
        uint sumOfBalances;
        uint sumOfTalliesOfHolders; // NOTE: This excludes beneficiaries without token balances
        address[] holders;
    }

    function buy(uint baseReceivedMin, uint deadline) public virtual override payable {
        // hardcode the parameters to minimize reverts
        //        baseReceiveMin = 0;
        //        deadline = type(uint).max;
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance - msg.value;
        prev.balanceOfContractCached = quoteBalanceOfContract;
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance + msg.value;
        prev.quoteBalanceOfOperator = sender == operator ? sender.balance + msg.value : operator.balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTalliesOfHolders = sum(holders, tallies);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.buy(baseReceivedMin, deadline);

        next.balanceOfContract = address(this).balance;
        next.balanceOfContractCached = quoteBalanceOfContract;
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOperator = sender == operator ? sender.balance : operator.balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTalliesOfHolders = sum(holders, tallies);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureGreaterEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureGreaterEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");

        uint diffBalanceOfContract = next.balanceOfContract - prev.balanceOfContract;
        uint diffBaseBalanceOfSender = next.baseBalanceOfSender - prev.baseBalanceOfSender;

        ensureGreaterEqual(diffBaseBalanceOfSender, baseReceivedMin, "diffBaseBalanceOfSender", "baseReceiveMin");
        ensureGreater(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (sender == operator) {
            ensureLess(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        } else {
            ensureEqual(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        }
        ensureGreaterEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureGreater(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        ensureGreaterEqual(next.sumOfTalliesOfHolders, prev.sumOfTalliesOfHolders, "next.sumOfTalliesOfHolders", "prev.sumOfTalliesOfHolders");
        ensureGreaterEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureIncludes(next.holders, sender, "next.holders", "sender");
        ensureLessEqual(diffBalanceOfContract, msg.value, "diffBalanceOfContract", "msg.value");
        ensureEqual(prev.balanceOfContractCached, prev.balanceOfContractCalculated, "prev.balanceOfContractCached", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContractCached, next.balanceOfContractCalculated, "next.balanceOfContractCached", "next.balanceOfContractCalculated");
        ensureGreaterEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureGreaterEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual override returns (uint quoteDistributed) {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance;
        prev.balanceOfContractCached = quoteBalanceOfContract;
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance;
        prev.quoteBalanceOfOperator = operator.balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTalliesOfHolders = sum(holders, tallies);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        quoteDistributed = super.sell(baseDeltaProposed, quoteReceivedMin, deadline);
        ensureNotEqual(quoteDistributed, 0, "quoteDistributed", "0"); // because deltaQuote is always divisible by scale without remainder

        next.balanceOfContract = address(this).balance;
        next.balanceOfContractCached = quoteBalanceOfContract;
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOperator = operator.balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTalliesOfHolders = sum(holders, tallies);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureLessEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLessEqual(next.tallyOfSender, 1, "next.tallyOfSender", "1"); // because tallyOfSender can be either 0 or 1 (if balanceOfSender == 0 or balanceOfSender != 0)

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.balanceOfContract - next.balanceOfContract;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;

        ensureGreaterEqual(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureLessEqual(neg_diffBaseBalanceOfSender, baseDeltaProposed, "neg_diffBaseBalanceOfSender", "baseDeltaProposed");
        ensureGreaterEqual(diffQuoteBalanceOfSender, quoteReceivedMin, "diffQuoteBalanceOfSender", "quoteReceivedMin");
        ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (msg.sender == operator) {
            // next.quoteBalanceOfOperator can have any relationship with prev.quoteBalanceOfOperator
        } else {
            if (fees == 0) {
                ensureEqual(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
            } else {
                ensureGreater(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
            }
        }
        ensureLessEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureLess(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        // next.sumOfTallies can have any relationship with prev.sumOfTallies // ensureAny(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTalliesOfHolders", "prev.sumOfTalliesOfHolders");
        ensureLessEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        // [sender may have sold the full amount, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
        ensureEqual(prev.balanceOfContractCached, prev.balanceOfContractCalculated, "prev.balanceOfContractCached", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContractCached, next.balanceOfContractCalculated, "next.balanceOfContractCached", "next.balanceOfContractCalculated");
        ensureGreaterEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureGreaterEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function withdraw() public virtual override {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance;
        prev.balanceOfContractCached = quoteBalanceOfContract;
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance;
        prev.quoteBalanceOfOperator = operator.balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTalliesOfHolders = sum(holders, tallies);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.withdraw();

        next.balanceOfContract = address(this).balance;
        next.balanceOfContractCached = quoteBalanceOfContract;
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOperator = operator.balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTalliesOfHolders = sum(holders, tallies);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureLessEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.balanceOfContract - next.balanceOfContract;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;
        uint neg_diffTallyOfSender = prev.tallyOfSender - next.tallyOfSender;

        ensureGreater(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureEqual(neg_diffBaseBalanceOfSender, 0, "neg_diffBaseBalanceOfSender", "0");
        ensureGreaterEqual(neg_diffBalanceOfContract, diffQuoteBalanceOfSender, "neg_diffBalanceOfContract", "diffQuoteBalanceOfSender");
        ensureGreaterEqual(neg_diffTallyOfSender, prev.tallyOfSender - defaultTally, "diffTallyOfSender", "quoteReceivedMin");
        ensureLessEqual(next.tallyOfSender, 1, "next.tallyOfSender", "1");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (msg.sender == operator) {
            // this assertion is redundant, because we already check ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender), but we'll leave it for completeness
            ensureGreater(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        } else {
            ensureEqual(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        }
        ensureLess(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        ensureLessEqual(next.sumOfTalliesOfHolders, prev.sumOfTalliesOfHolders, "next.sumOfTalliesOfHolders", "prev.sumOfTalliesOfHolders");
        ensureEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureEqual(prev.balanceOfContractCached, prev.balanceOfContractCalculated, "prev.balanceOfContractCached", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContractCached, next.balanceOfContractCalculated, "next.balanceOfContractCached", "next.balanceOfContractCalculated");
        ensureGreaterEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureGreaterEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function speedIsBounded() internal {
        ensure(speed > 0, "speed > 0");
        ensure(speed <= maxSpeed, "speed <= maxSpeed");
    }

    function taxIsBounded() internal {
        // tax == 0 is ok
        ensure(royalties <= maxRoyalties, "tax <= maxTax");
    }

    function allUsersHaveTallies() internal {
        logArray(holders, "holders");
        for (uint i = 0; i < holders.length; i++) {
            log('balanceOf(holders[i])', balanceOf(holders[i]));
            ensureGreater(tallies[holders[i]], 0, string.concat("tallies[holders[", toString(i), "]]"), "0");
        }
        for (uint i = 0; i < beneficiaries.length; i++) {
            log('balanceOf(beneficiaries[i])', balanceOf(beneficiaries[i]));
            ensureGreater(tallies[beneficiaries[i]], 0, string.concat("tallies[beneficiaries[", toString(i), "]]"), "0");
        }
        ensureEqual(tallies[address(0)], 0, "tallies[address(0)]", "0");
    }

    function contractBalanceIsCorrect() internal {
        uint sumOfTalliesOfHolders = sum(holders, tallies);
        uint sumOfPreallocations = defaultTally * holders.length;
        uint expectedBalance = quoteBalanceOfContract + sumOfTalliesOfHolders - sumOfPreallocations;
        // NOTE: Using GreaterEqual instead of Equal because if the sender sells his full balance, he is no longer included in holders, so sumOfTalliesOfHolders will not include his tally
        ensureGreaterEqual(address(this).balance, expectedBalance, "address(this).balance", "quoteBalanceOfContract + sumOfTallies - sumOfPreallocations");
    }

    // Must be overridden to prevent Echidna from reporting an overflow (there's no explicit revert in ERC20 because it relies on automatic overflow checking)
    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool) {
        address owner = _msgSender();
        uint currentAllowance = allowance(owner, spender);
        unchecked {
            uint newAllowance = currentAllowance + addedValue;
            require(newAllowance >= currentAllowance, "ERC20: increased allowance above type(uint).max");
        }
        return super.increaseAllowance(spender, addedValue);
    }

}
