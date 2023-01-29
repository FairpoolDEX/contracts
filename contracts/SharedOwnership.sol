// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

abstract contract SharedOwnership {
    // Required to limit the gas costs of the beneficiaries loop in distribute()
    uint8 public constant maxBeneficiaries = 16;

    uint public constant precisionOfShares = 6;

    // IMPORTANT: must be kept small to minimize the probability of the overflow in getShareAmount()
    // IMPORTANT: must be kept small to minimize the min quoteDelta in sell()
    uint public constant scaleOfShares = 10 ** precisionOfShares;

    address[] public beneficiaries;

    mapping (address => uint) public shares;

    mapping (address => uint) internal indexesOfBeneficiaries;

    error BeneficiariesLengthMustBeEqualToSharesLength();
    error BeneficiariesLengthMustBeLessThanOrEqualToMax();
    error ShareMustBeGreaterThanZero();
    error SumOfSharesMustBeEqualToScale();
    error ToAddressMustBeNonZero();
    error AmountMustBeNonZero();
    error SharesMustBeGreaterThanOrEqualToAmount();

    event TransferShares(address indexed from, address indexed to, uint amount);

    constructor(address payable[] memory beneficiaries_, uint[] memory shares_) {
        if (beneficiaries_.length == 0) {
            beneficiaries = [msg.sender];
            shares[msg.sender] = scaleOfShares;
        } else {
            if (beneficiaries_.length != shares_.length) revert BeneficiariesLengthMustBeEqualToSharesLength();
            if (beneficiaries_.length > maxBeneficiaries) revert BeneficiariesLengthMustBeLessThanOrEqualToMax();
            beneficiaries = beneficiaries_;
            uint sumOfShares;
            for (uint i = 0; i < shares_.length; i++) {
                uint share = shares_[i];
                if (share == 0) revert ShareMustBeGreaterThanZero();
                // no need to check (share <= scale) because we already check (sumOfShares != scale)
                shares[beneficiaries_[i]] = shares_[i];
                sumOfShares += share;
            }
            if (sumOfShares != scaleOfShares) revert SumOfSharesMustBeEqualToScale();
        }
    }

    /**
     * This function doesn't support burns, because it would break the add/remove logic
     */
    function transferShares(address to, uint amount) external returns (bool) {
        address from = msg.sender;
        if (to == address(0)) revert ToAddressMustBeNonZero();
        if (amount == 0) revert AmountMustBeNonZero();
        uint256 fromBalance = shares[from];
        if (fromBalance < amount) revert SharesMustBeGreaterThanOrEqualToAmount();
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
        if (from == to || amount == 0) {
            return;
        }
        if (from != address(0) && shares[from] == 0) {
            removeBeneficiary(from);
        }
        if (to != address(0) && shares[to] == amount) {
            addBeneficiary(to);
        }
        if (beneficiaries.length > maxBeneficiaries) revert BeneficiariesLengthMustBeLessThanOrEqualToMax();
    }

    /**
     * Assumes that `holder` does not exist in `holders`
     */
    function addBeneficiary(address target) internal virtual {
        indexesOfBeneficiaries[target] = beneficiaries.length;
        beneficiaries.push(target);
    }

    /**
     * Assumes that `target` exists in `beneficiaries`
     * Uses a gas-optimal algorithm for removing the value from array
     * Does not preserve array order
     */
    function removeBeneficiary(address target) internal virtual {
        uint index = indexesOfBeneficiaries[target];
        address last = beneficiaries[beneficiaries.length - 1];
        indexesOfBeneficiaries[last] = index;
        beneficiaries[index] = last;
        beneficiaries.pop();
        delete indexesOfBeneficiaries[target];
    }

    function getShareAmount(uint amount, address target) internal view returns (uint) {
        return (amount * shares[target]) / scaleOfShares;
    }

    function beneficiariesLength() external view returns (uint) {
        return beneficiaries.length;
    }
}
