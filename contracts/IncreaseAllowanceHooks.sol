// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

contract IncreaseAllowanceHooks {
    // Prevent Echidna from reporting an overflow (there's no explicit revert in ERC20 because it relies on automatic overflow checking)
    function checkAllowance(address, uint256 addedValue, uint256 currentAllowance) internal pure {
        unchecked {
            uint newAllowance = currentAllowance + addedValue;
            require(newAllowance >= currentAllowance, "ERC20: increased allowance above type(uint).max");
        }
    }

}
