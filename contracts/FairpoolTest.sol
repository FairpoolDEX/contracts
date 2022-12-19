// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Fairpool.sol";

// msg.value is bounded by native currency supply
abstract contract FairpoolTest is Fairpool, Util {

//test(): failed!💥
//Call sequence:
//buy(0,1530223333) Value: 0x102200072285b48a7
//transfer(0xdeadbeef,0)
//test()
//Event sequence: Panic(1), LogS("not(totalsFollowsHolders)")

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
            ensure(totals[holders[i]] > 0, holders[i], totals[holders[i]], "totalsFollowsHolders");
        }
        ensureEqual(totals[address(0)], 0, "totals[address(0)]", "0");
    }
}
