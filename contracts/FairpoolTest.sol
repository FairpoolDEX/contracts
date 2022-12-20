// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Fairpool.sol";

// msg.value is bounded by native currency supply
abstract contract FairpoolTest is Fairpool, Util {
//Call sequence:                                                                                                       │
//│ 1.setSpeed(709) from: 0x0000000000000000000000000000000000030000 Time delay: 112559 seconds Block delay: 20138       │
//│ 2.buy(695,4294967296) from: 0x0000000000000000000000000000000000030000 Value: 0x9235c70c46d1c659 Time delay: 598286  │
//│   seconds Block delay: 48104                                                                                         │
//│ 3.transfer(0x24ce4116451f90398d6a41b27fa4db01e7cc7f97,4294967295) from: 0x0000000000000000000000000000000000030000   │
//│   Time delay: 136112 seconds Block delay: 16480                                                                      │
//│ 4.test() from: 0x0000000000000000000000000000000000010000 Time delay: 490004 seconds Block delay: 45603              │
//│ Event sequence:                                                                                                      │
//│ Panic(1)                                                                                                             │
//│ LogS("not(totalsFollowsHolders)") from: FairpoolTestEchidna@0x00a329c0648769A73afAc7F9381E08FB43dBEA72
//Seed: 1441043467538893535
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

    struct BuyVars {
        uint balanceOfContract;
        uint balanceOfContractCalculated;
        uint balanceOfSender;
        uint totalSupply;
        uint totalOfSender;
        address[] holders;
    }

//Call sequence:
//buy(0,1529945499) Value: 0x1
//
//Event sequence: Panic(1), Transfer(0) from: FairpoolTestEchidna@0x00a329c0648769A73afAc7F9381E08FB43dBEA72, Buy(Context@0x0000000000000000000000000000000000010000, 0, 1) from: FairpoolTestEchidna@0x00a329c0648769A73afAc7F9381E08FB43dBEA72, LogU(1) from: FairpoolTestEchidna@0x00a329c0648769A73afAc7F9381E08FB43dBEA72, LogU(1) from: FairpoolTestEchidna@0x00a329c0648769A73afAc7F9381E08FB43dBEA72, LogS("not(next.balanceOfContract > prev.balanceOfContract)") from: FairpoolTestEchidna@0x00a329c0648769A73afAc7F9381E08FB43dBEA72
    function buy(uint baseReceivedMin, uint deadline) public virtual override payable {
        // hardcode the parameters to minimize reverts
        //        baseReceiveMin = 0;
        //        deadline = type(uint).max;
        BuyVars memory prev;
        BuyVars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance - msg.value;
        prev.balanceOfSender = balanceOf(sender);
        prev.totalSupply = totalSupply();
        prev.totalOfSender = totals[sender];
        prev.holders = getOld(holders);

        super.buy(baseReceivedMin, deadline);

        next.balanceOfContract = address(this).balance;
        next.balanceOfSender = balanceOf(sender);
        next.totalSupply = totalSupply();
        next.totalOfSender = totals[sender];
        next.holders = getNew(holders);

        logPN('balanceOfContract', prev.balanceOfContract, next.balanceOfContract);
        logPN('balanceOfSender', prev.balanceOfSender, next.balanceOfSender);
        uint diffBalanceOfContract = next.balanceOfContract - prev.balanceOfContract;
        uint diffBalanceOfSender = next.balanceOfSender - prev.balanceOfSender;
        prev.balanceOfContractCalculated = prev.totalSupply * prev.totalSupply * speed / scale;
        next.balanceOfContractCalculated = next.totalSupply * next.totalSupply * speed / scale;

        ensureGreaterEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        if (next.balanceOfContract == prev.balanceOfContract) {
            // the purchase was refunded (amount too small)
            ensureEqual(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
            ensureEqual(next.totalSupply, prev.totalSupply, "next.totalSupply", "prev.totalSupply");
            ensureEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");
            ensureEqual(next.holders, prev.holders, "next.holders", "prev.holders");
            // [sender may have bought earlier, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
            // [already checked by if, so not checking ensureEqual(diffBalanceOfContract, 0)] ensureEqual(diffBalanceOfContract, 0, "diffBalanceOfContract", "0");
        } else {
            ensureGreater(next.balanceOfSender, prev.balanceOfSender, "next.balanceOfSender", "prev.balanceOfSender");
            ensureGreater(next.totalSupply, prev.totalSupply, "next.totalSupply", "prev.totalSupply");
            ensureGreaterEqual(next.totalOfSender, prev.totalOfSender, "next.totalOfSender", "prev.totalOfSender");
            ensureGreaterEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
            ensureIncludes(next.holders, sender, "next.holders", "sender");
            ensureLessEqual(diffBalanceOfContract, msg.value, "diffBalanceOfContract", "msg.value");
        }
        ensureGreaterEqual(diffBalanceOfSender, baseReceivedMin, "diffBalance", "baseReceiveMin");
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
