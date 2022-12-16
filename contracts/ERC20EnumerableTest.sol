// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20EnumerableTest is ERC20Enumerable, Ownable, Util {
    constructor(string memory name_, string memory symbol_, uint totalSupply_) ERC20(name_, symbol_) Ownable() {
        _mint(owner(), totalSupply_);
    }

    // Using a single function to check all invariants in one transaction
    function test() public {
        holdersHavePositiveBalance();
        holdersAreUnique();
        holdersAreNonZero();
        totalSupplyIsEqual();
        indexesOfHoldersMatchHolders();
    }

    function holdersHavePositiveBalance() internal {
        for (uint i = 0; i < holders.length; i++) {
            ensure(balanceOf(holders[i]) != 0, holders[i], "holdersHavePositiveBalance");
        }
    }

    mapping(address => bool) internal holdersUniqueCache;
    function holdersAreUnique() internal {
        ensureNoDuplicateInArrayOfAddresses(holdersUniqueCache, holders, "holdersAreUnique");
    }

    function holdersAreNonZero() internal {
        ensureNoneEqual(holders, address(0), "holders");
    }

    function totalSupplyIsEqual() public {
        ensureEqual(totalSupplyArray(), totalSupply(), "totalSupplyArray()", "totalSupply()");
    }

    function indexesOfHoldersMatchHolders() internal {
        for (uint i = 0; i < holders.length; i++) {
            uint $i = indexesOfHolders[holders[i]];
            ensureEqual($i, i, "indexesOfHoldersMatchHolders: $i == i");
        }
    }

    function totalSupplyArray() internal view returns (uint) {
        uint sum;
        for (uint i = 0; i < holders.length; i++) {
            sum += balanceOf(holders[i]);
        }
        return sum;
    }

}
