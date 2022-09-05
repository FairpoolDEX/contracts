// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "solmate/src/utils/FixedPointMathLib.sol";
import "hardhat/console.sol";
import "./ERC20Enumerable.sol";

/**
 * Notes:
 * - Revert messages should be translated in UI
 * - Variables should use uint instead of smaller types because uint actually costs less gas
 * - Custom errors must be used over string descriptions because it costs less gas
 *   - Don't add parameters to errors if they are already available to the caller (e.g. don't add function arguments as parameters)
 */
contract Fairpool is ERC20Enumerable, ReentrancyGuard {
    using FixedPointMathLib for uint;

    // multiplier in the formula for base amount
    uint public speed;

    // percentage of buy value that the contract distributes to the token holders & beneficiaries
    uint public tax;

    // NOTE: IMPORTANT: this value must be equal to the decimals of the base asset of the current blockchain (so that msg.value is scaled to this amount of decimals)
    // NOTE: if you need to change this, you need to also override the decimals() function and return the _decimals constant from it
    uint8 public constant _decimals = 18;

    // one token, as displayed in the UI
    uint public constant one = 10 ** _decimals;

    uint public constant scale = 10 ** _decimals;

    uint internal constant maxBeforeSquare = 2**128 - 1;

    // given uint a, uint b, uint max: if a < max and b < max and a * b does not overflow, then max is maxMultiplier
    uint internal constant maxMultiplier = type(uint).max / 2 - 1;

    uint internal constant maxShare = one;

    /// Tax can't be greater or equal to maximum multiplier
    error TaxGteMaxMultiplier();
    error BeneficiaryAddressesLengthMustBeEqualToBeneficiarySharesLength();
    error BeneficiaryShareMustBeGreaterThanZero(uint beneficiaryIndex);
    error BeneficiaryShareMustBeLessThanOrEqualToMaxShare(uint beneficiaryIndex);
    error SumOfBeneficiarySharesMustBeLessThanOrEqualToMaxShare();
    error BlockTimestampMustBeLessThanOrEqualToDeadline();
    error PaymentRequired();
    error BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(uint baseDelta);
    error QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(uint quoteDelta);
    error BaseDeltaMustBeGreaterThanZero();
    error SenderMustBeBeneficiary();
    error NewTaxMustBeLessThanOldTax();

    event Buy(address addr, uint baseDelta, uint quoteDelta);
    event Sell(address addr, uint baseDelta, uint quoteDelta, uint quoteReceived);
    event SetTax(uint tax);

    // an address that receives a fee
    struct Beneficiary {
        address payable addr;
        uint share;
    }

    Beneficiary[] public beneficiaries;

    constructor(string memory name_, string memory symbol_, uint speed_, uint tax_, address payable[] memory beneficiaryAddrs_, uint[] memory beneficiaryShares_) ERC20(name_, symbol_) {
        if (tax_ >= maxMultiplier) revert TaxGteMaxMultiplier();
        if (beneficiaryAddrs_.length != beneficiaryShares_.length) revert BeneficiaryAddressesLengthMustBeEqualToBeneficiarySharesLength();
        speed = speed_;
        tax = tax_;
        uint sumOfShares;
        for (uint i = 0; i < beneficiaryAddrs_.length; i++) {
            address payable addr = beneficiaryAddrs_[i];
            uint share = beneficiaryShares_[i];
            if (share == 0) revert BeneficiaryShareMustBeGreaterThanZero(i);
            if (share > maxShare) revert BeneficiaryShareMustBeLessThanOrEqualToMaxShare(i);
            beneficiaries.push(Beneficiary(addr, share));
            sumOfShares += share;
        }
        if (sumOfShares > maxShare) revert SumOfBeneficiarySharesMustBeLessThanOrEqualToMaxShare();
    }

    function buy(uint baseReceiveMin, uint deadline) external payable nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (msg.value == 0) revert PaymentRequired();
        uint quoteDelta = msg.value;
        uint baseDelta = getBaseDeltaBuy(quoteDelta);
        if (baseDelta < baseReceiveMin) revert BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(baseDelta);
        _mint(msg.sender, baseDelta);
        emit Buy(msg.sender, baseDelta, quoteDelta);
    }

    function sell(uint baseDelta, uint quoteReceivedMin, uint deadline) external nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        uint quoteDelta = getQuoteDeltaSell(baseDelta);
        _burn(msg.sender, baseDelta);
        uint profit = (quoteDelta * tax) / scale;
        uint remainder = distribute(profit);
        uint quoteReceived = quoteDelta - profit + remainder;
        if (quoteReceived < quoteReceivedMin) revert QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(quoteDelta);
        payable(msg.sender).transfer(quoteReceived);
        emit Sell(msg.sender, baseDelta, quoteDelta, quoteReceived);
    }

    /**
     * IMPORTANT: the contract must not have a `setSpeed` function, because otherwise it would be possible to reach a state where some holders can't sell:
     * - Contract is drained of quote (quote amount on contract address is zero)
     * - Contract is not drained of base (totalSupply is not zero)
     *
     * Alternatively, we can implement a `setSpeed` function that scales the current amounts of tokens, but:
     * - It's difficult to implement
     * - The call gas cost increases linearly with amount of holders
     */

    //    // nonReentrant modifier is not needed because the function doesn't call any external contracts
    //    function setSpeed(uint _speed) external {
    //        if (!senderIsBeneficiary()) revert SenderMustBeBeneficiary();
    //        speed = _speed;
    //        emit SetSpeed(_speed);
    //    }

    function setTax(uint _tax) external {
        if (!senderIsBeneficiary()) revert SenderMustBeBeneficiary();
        if (_tax >= tax) revert NewTaxMustBeLessThanOldTax();
        tax = _tax;
        emit SetTax(_tax);
    }

    /* Internal functions */

    /**
     * Distributes profit between beneficiaries and holders
     * Beneficiaries receive shares of profit
     * Holders receive shares of profit remaining after beneficiaries
     */
    function distribute(uint profit) internal returns (uint remainder) {
        uint sumOfBeneficiaryTotals;
        for (uint i = 0; i < beneficiaries.length; i++) {
            uint total = profit * beneficiaries[i].share / scale;
            beneficiaries[i].addr.transfer(total);
            sumOfBeneficiaryTotals += total;
        }
        profit -= sumOfBeneficiaryTotals;

        uint sumOfHolderTotals;
        for (uint i = 0; i < holders.length; i++) {
            uint total = profit * balanceOf(holders[i]) / totalSupply();
            payable(holders[i]).transfer(total);
            sumOfHolderTotals += total;
        }
        profit -= sumOfHolderTotals;

        return profit;
    }

    function getBaseDeltaBuy(uint quoteDelta) internal view returns (uint baseDelta) {
        uint quoteAmount = address(this).balance;
        uint baseAmount = totalSupply();
        uint quoteFinal = quoteAmount + quoteDelta;
        uint baseFinal = (quoteFinal.sqrt() * scale) / speed;
        return baseFinal - baseAmount;
    }

    function getQuoteDeltaSell(uint baseDelta) internal view returns (uint quoteDelta) {
        uint quoteAmount = address(this).balance;
        uint baseAmount = totalSupply();
        uint quoteFinalSqrt = ((baseAmount - baseDelta) * speed) / scale;
        uint quoteFinal = quoteFinalSqrt * quoteFinalSqrt;
        return quoteAmount - quoteFinal;
    }

    function senderIsBeneficiary() internal view returns (bool) {
        for (uint i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i].addr == msg.sender) return true;
        }
        return false;
    }

    /* View functions */

    function beneficiariesLength() external view returns (uint) {
        return beneficiaries.length;
    }

    /* Pure functions */

    /* Override functions */

    function _beforeTokenTransfer(
        address,
        address to,
        uint256
    ) internal virtual override {
        // check that address is payable before transferring the tokens, otherwise distribute() will revert for everyone
        // source: https://ethereum.stackexchange.com/a/123679
        // slither-disable-next-line arbitrary-send-eth
        require(payable(to).send(0), "Fairpool: !payable(to)");
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
