// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Fairpool.sol";

// msg.value is bounded by native currency supply
abstract contract FairpoolTest is Fairpool, Util {
    function test() public {
        speedIsBounded();
        taxIsBounded();
        totalsFollowsHolders();
    }

    // allow testing different combinations of speed & tax
    function reset(uint speed_, uint tax_) public onlyOwner {
        for (uint i = 0; i < holders.length; i++) {
            _burn(holders[i], balanceOf(holders[i]));
        }
        payable(owner()).transfer(address(this).balance);
        _setSpeed(speed_);
        _setTax(tax_);
    }

    // Using a struct to avoid the "stack too deep" error
    struct Vars {
        uint balanceOfContract;
        uint balanceOfContractCalculated;
        uint balanceOfSender;
        uint totalOfSender;
        uint sumOfBalances;
        uint sumOfTotals;
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
        prev.balanceOfSender = balanceOf(sender);
        prev.totalOfSender = totals[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTotals = sum(holders, totals);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.buy(baseReceivedMin, deadline);

        next.balanceOfContract = address(this).balance;
        next.balanceOfSender = balanceOf(sender);
        next.totalOfSender = totals[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTotals = sum(holders, totals);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureGreaterEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureGreaterEqual(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");

        uint diffBalanceOfContract = next.balanceOfContract - prev.balanceOfContract;
        uint diffBalanceOfSender = next.balanceOfSender - prev.balanceOfSender;

        ensureGreaterEqual(diffBalanceOfSender, baseReceivedMin, "diffBalanceOfSender", "baseReceiveMin");
        if (next.balanceOfContract == prev.balanceOfContract) { // the buy transaction was refunded (amount too small)
            ensureEqual(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
            ensureEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");
            ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureEqual(next.sumOfTotals, prev.sumOfTotals, "next.sumOfTotals", "prev.sumOfTotals");
            ensureEqual(next.holders, prev.holders, "next.holders", "prev.holders");
            // [sender may have bought earlier, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
            // [already checked by if, so not checking ensureEqual(diffBalanceOfContract, 0)] ensureEqual(diffBalanceOfContract, 0, "diffBalanceOfContract", "0");
        } else {
            ensureGreater(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
            ensureGreaterEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");
            ensureGreater(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureGreaterEqual(next.sumOfTotals, prev.sumOfTotals, "next.sumOfTotals", "prev.sumOfTotals");
            ensureGreaterEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
            ensureIncludes(next.holders, sender, "next.holders", "sender");
            ensureLessEqual(diffBalanceOfContract, msg.value, "diffBalanceOfContract", "msg.value");
        }
        ensureEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual override {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance;
        prev.balanceOfSender = balanceOf(sender);
        prev.totalOfSender = totals[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTotals = sum(holders, totals);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.sell(baseDeltaProposed, quoteReceivedMin, deadline);

        next.balanceOfContract = address(this).balance;
        next.balanceOfSender = balanceOf(sender);
        next.totalOfSender = totals[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTotals = sum(holders, totals);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureLessEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureLessEqual(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
        ensureGreaterEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.balanceOfContract - next.balanceOfContract;
        uint neg_diffBalanceOfSender = prev.balanceOfSender - next.balanceOfSender;
        uint diffTotalOfSender = next.totalOfSender - prev.totalOfSender;

        ensureGreaterEqual(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureLessEqual(neg_diffBalanceOfSender, baseDeltaProposed, "neg_diffBalanceOfSender", "baseDeltaProposed");
        ensureGreaterEqual(diffTotalOfSender, quoteReceivedMin, "diffTotalOfSender", "quoteReceivedMin");
        if (neg_diffBalanceOfContract == 0) { // the sell transaction was refunded (amount too small)
            ensureEqual(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
            ensureEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");
            ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureEqual(next.sumOfTotals, prev.sumOfTotals, "next.sumOfTotals", "prev.sumOfTotals");
            ensureEqual(next.holders, prev.holders, "next.holders", "prev.holders");
            ensureIncludes(next.holders, sender, "next.holders", "sender");
        } else {
            ensureLess(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
            ensureLessEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");
            ensureLess(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureLessEqual(next.sumOfTotals, prev.sumOfTotals, "next.sumOfTotals", "prev.sumOfTotals");
            ensureLessEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
            // [sender may have sold the full amount, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
        }
        ensureEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function speedIsBounded() internal {
        ensure(speed > 0, "speed > 0");
        ensure(speed <= maxSpeed, "speed <= maxSpeed");
    }

    function taxIsBounded() internal {
        // tax == 0 is ok
        ensure(tax <= maxTax, "tax <= maxTax");
    }

    function totalsFollowsHolders() internal {
        logArray(holders, "holders");
        for (uint i = 0; i < holders.length; i++) {
            ensureGreater(totals[holders[i]], 0, string.concat("totals[holders[", toString(i), "]]"), "0");
        }
        ensureEqual(totals[address(0)], 0, "totals[address(0)]", "0");
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

    function isPreallocationAmount(uint total) internal pure returns (bool) {
        return total == minTotal;
    }

}
