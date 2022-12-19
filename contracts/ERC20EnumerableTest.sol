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

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address from = _msgSender();
        address[] memory oldHolders = copy(holders);
        uint oldBalanceOfFrom = balanceOf(from);
        uint oldBalanceOfTo = balanceOf(to);
        uint oldTotalSupply = totalSupply();
        bool result = super.transfer(to, amount);
        uint newBalanceOfFrom = balanceOf(from);
        uint newBalanceOfTo = balanceOf(to);
        uint newTotalSupply = totalSupply();
        address[] memory newHolders = holders;
        ensure(newBalanceOfFrom <= oldBalanceOfFrom, "newBalanceOfFrom <= oldBalanceOfFrom");
        ensure(newBalanceOfTo >= oldBalanceOfTo, "newBalanceOfTo >= oldBalanceOfTo");
        if (from == to || amount == 0) {
            ensureEqual(newBalanceOfFrom, oldBalanceOfFrom, "newBalanceOfTo", "oldBalanceOfTo");
            ensureEqual(newBalanceOfTo, oldBalanceOfTo, "newBalanceOfTo", "oldBalanceOfTo");
            ensureEqual(oldHolders, newHolders, "oldHolders", "newHolders");
        } else {
            uint diffAbsBalanceFrom = oldBalanceOfFrom - newBalanceOfFrom;
            uint diffAbsBalanceTo = newBalanceOfTo - oldBalanceOfTo;
            ensureEqual(diffAbsBalanceFrom, amount, "diffAbsBalanceFrom", "amount");
            ensureEqual(diffAbsBalanceTo, amount, "diffBalanceTo", "amount");
        }
        if (newBalanceOfFrom == 0) {
            ensureNotIncludes(newHolders, from, "newHolders");
        } else {
            ensureIncludes(newHolders, from, "newHolders");
        }
        if (newBalanceOfTo == 0) {
            ensureNotIncludes(newHolders, to, "newHolders");
        } else {
            ensureIncludes(newHolders, to, "newHolders");
        }
        ensureEqual(newTotalSupply, oldTotalSupply, "newTotalSupply", "oldTotalSupply");
        return result;
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
        ensureNotIncludes(holders, address(0), "holders");
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
