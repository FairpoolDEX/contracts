// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract ERC20Enumerable is ERC20 {
    address[] public holders;

    // NOTE: solidity will return 0 for any address that is not present in indexesOfHolders. However, 0 is a valid index. We test against it via totalSupplyArray_eq_totalSupply()
    mapping (address => uint) internal indexesOfHolders;

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from == to || amount == 0) {
            return;
        }
        if (from != address(0) && balanceOf(from) == 0) {
            removeHolder(from);
        }
        // if balanceOf(to) == amount, then balanceOfBeforeTransfer(to) == 0, so it should be added to holders
        if (to != address(0) && balanceOf(to) == amount) {
            addHolder(to);
        }
    }

    /**
     * Assumes that `holder` does not exist in `holders`
     */
    function addHolder(address target) internal {
        indexesOfHolders[target] = holders.length;
        holders.push(target);
    }

    /**
     * Assumes that `target` exists in `holders`
     * Uses a gas-optimal algorithm for removing the value from array
     * Does not preserve array order
     */
    function removeHolder(address target) internal {
        uint index = indexesOfHolders[target];
        address last = holders[holders.length - 1];
        indexesOfHolders[last] = index;
        holders[index] = last;
        holders.pop();
        delete indexesOfHolders[target];
    }

    function holdersLength() public view returns (uint) {
        return holders.length;
    }
}

/// UNUSED:
/// #invariant "balanceOf"
///    forall(uint i in holders)
///       balanceOf(holders[i]) > 0;
/// #invariant "totalSupplyArray() == totalSupply()" totalSupplyArray() == totalSupply();
