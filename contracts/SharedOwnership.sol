// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract SharedOwnership {
    uint8 private constant _decimals = 18;
    uint private constant scale = 10 ** _decimals;

    address[] public beneficiaries;
    mapping (address => uint) public shares;
    mapping (address => uint) private indexesOfBeneficiaries;

    error BeneficiariesLengthMustBeEqualToSharesLength();
    error ShareMustBeGreaterThanZero();
    error ShareMustBeLessThanOrEqualToScale();
    error SumOfSharesMustBeLessThanOrEqualToScale();
    error ToAddressMustBeNonZero();
    error BalanceMustBeGreaterThanOrEqualToAmount();

    event TransferShares(address from, address to, uint amount);

    constructor(address payable[] memory beneficiaries_, uint[] memory shares_) {
        if (beneficiaries_.length != shares_.length) revert BeneficiariesLengthMustBeEqualToSharesLength();
        beneficiaries = beneficiaries_;
        uint lengthOfShares = shares_.length;
        uint sumOfShares;
        for (uint i = 0; i < lengthOfShares; i++) {
            uint share = shares_[i];
            if (share == 0) revert ShareMustBeGreaterThanZero();
            // no need to check if (share > scale) because we already check if (sumOfShares > scale)
            shares[beneficiaries_[i]] = shares_[i];
            sumOfShares += share;
        }
        if (sumOfShares > scale) revert SumOfSharesMustBeLessThanOrEqualToScale();
    }

    /**
     * This function doesn't support burns, because it would break the add/remove logic
     * - It's still possible for any beneficiary to reduce the tax & send his shares to existing beneficiaries (this would be equivalent to burning the shares)
     */
    function transferShares(address to, uint amount) external returns (bool) {
        address from = msg.sender;
        if (to == address(0)) revert ToAddressMustBeNonZero();
        uint256 fromBalance = shares[from];
        if (fromBalance < amount) revert BalanceMustBeGreaterThanOrEqualToAmount();
        unchecked { shares[from] = fromBalance - amount; }
        shares[to] += amount;
        emit TransferShares(from, to, amount);
        _afterSharesTransfer(from, to, amount);
        return true;
    }

    /**
     * This logic has to be duplicated from ERC20Enumerable because it relies on indexesOfBeneficiaries mapping which can't be passed by reference
     */
    function _afterSharesTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        if (from == to) {
            return;
        }
        if (from != address(0) && shares[from] == 0) {
            removeBeneficiary(from);
        }
        if (to != address(0) && shares[to] == amount) {
            addBeneficiary(to);
        }
    }

    /**
     * Assumes that `holder` does not exist in `holders`
     */
    function addBeneficiary(address target) internal {
        indexesOfBeneficiaries[target] = beneficiaries.length;
        beneficiaries.push(target);
    }

    /**
     * Assumes that `target` exists in `beneficiaries`
     * Uses a gas-optimal algorithm for removing the value from array
     * Does not preserve array order
     */
    function removeBeneficiary(address target) internal {
        uint index = indexesOfBeneficiaries[target];
        address last = beneficiaries[beneficiaries.length - 1];
        indexesOfBeneficiaries[last] = index;
        beneficiaries[index] = last;
        beneficiaries.pop();
        delete indexesOfBeneficiaries[target];
    }

    function isBeneficiary(address target) internal view returns (bool) {
        return shares[target] != 0;
    }

    function getShareOf(uint amount, address target) internal view returns (uint) {
        return (amount * shares[target]) / scale;
    }

    function beneficiariesLength() external view returns (uint) {
        return beneficiaries.length;
    }
}
