// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

abstract contract ERC20Enumerable is ERC20 {
    address[] public holders;
    mapping (address => uint) private indexesOfHolders;

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from == to) {
            return;
        }
        if (from != address(0) && balanceOf(from) == 0) {
            removeHolder(from);
        }
        // if balanceOf(to) == amount, then balanceOfBeforeTransfer(to) == 0, so it should be added to holders
        if (to != address(0) && balanceOf(to) == amount && amount != 0) {
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
