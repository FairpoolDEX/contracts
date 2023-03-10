// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

abstract contract SharedOwnership {
    // Required to limit the gas costs of the marketers loop in distribute()
    uint public constant marketersLengthMax = 16;

    // IMPORTANT: must be kept small to minimize the probability of the overflow in getShareAmount()
    uint public constant scale = 10 ** 6;

    address[] public marketers;

    mapping (address => uint) public shares;

    mapping (address => uint) internal marketersIndexes;

    error MarketersLengthMustBeEqualToSharesLength();
    error MarketersLengthMustBeLessThanOrEqualToMarketersLengthMax();
    error ShareMustBeGreaterThanZero();
    error SumOfSharesMustBeEqualToScale();
    error ToAddressMustBeNonZero();
    error ToAddressMustBeNotEqualToThisContractAddress();
    error AmountMustBeNonZero();
    error SharesMustBeGreaterThanOrEqualToAmount();

    event TransferShares(address indexed from, address indexed to, uint amount);

    constructor(address payable[] memory marketersNew, uint[] memory sharesNew) {
        if (marketersNew.length == 0) {
            marketers = [msg.sender];
            shares[msg.sender] = scale;
        } else {
            if (marketersNew.length != sharesNew.length) revert MarketersLengthMustBeEqualToSharesLength();
            if (marketersNew.length > marketersLengthMax) revert MarketersLengthMustBeLessThanOrEqualToMarketersLengthMax();
            marketers = marketersNew;
            uint sumOfShares;
            for (uint i = 0; i < sharesNew.length; i++) {
                uint share = sharesNew[i];
                if (share == 0) revert ShareMustBeGreaterThanZero();
                // no need to check (share <= scale) because we already check (sumOfShares != scale)
                shares[marketersNew[i]] = sharesNew[i];
                sumOfShares += share;
            }
            if (sumOfShares != scale) revert SumOfSharesMustBeEqualToScale();
        }
    }

    /**
     * This function doesn't support burns, because it would break the add/remove logic
     */
    function transferShares(address to, uint amount) external returns (bool) {
        address from = msg.sender;
        if (to == address(0)) revert ToAddressMustBeNonZero();
        if (to == address(this)) revert ToAddressMustBeNotEqualToThisContractAddress();
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
     * This logic has to be duplicated from ERC20Enumerable because it relies on indexesOfMarketers mapping which can't be passed by reference
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
            addMarketer(to);
        }
        if (marketers.length > marketersLengthMax) revert MarketersLengthMustBeLessThanOrEqualToMarketersLengthMax();
    }

    /**
     * Assumes that `holder` does not exist in `holders`
     */
    function addMarketer(address target) internal virtual {
        marketersIndexes[target] = marketers.length;
        marketers.push(target);
    }

    /**
     * Assumes that `target` exists in `marketers`
     * Uses a gas-optimal algorithm for removing the value from array
     * Does not preserve array order
     */
    function removeBeneficiary(address target) internal virtual {
        uint index = marketersIndexes[target];
        address last = marketers[marketers.length - 1];
        marketersIndexes[last] = index;
        marketers[index] = last;
        marketers.pop();
        delete marketersIndexes[target];
    }

    function getShareAmount(uint amount, address target) internal view returns (uint) {
        return (amount * shares[target]) / scale;
    }

    function marketersLength() external view returns (uint) {
        return marketers.length;
    }
}
