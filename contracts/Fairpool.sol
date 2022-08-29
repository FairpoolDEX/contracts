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
 */
contract Fairpool is ERC20Enumerable, ReentrancyGuard {
    using FixedPointMathLib for uint;

    // multiplier in the formula for base amount
    uint public speed;

    // percentage of buy value that the contract distributes to the token holders & beneficiaries
    uint public margin;

    // NOTE: IMPORTANT: this value must be equal to the decimals of the base asset of the current blockchain (so that msg.value is scaled to this amount of decimals)
    // NOTE: if you need to change this, you need to also override the decimals() function and return the _decimals constant from it
    uint8 public constant _decimals = 18;

    // one token, as displayed in the UI
    uint public constant one = 10 ^ _decimals;

    uint public constant scale = 10 ^ _decimals;

    uint internal constant maxBeforeSquare = 2**128 - 1;

    // given uint a, uint b, uint max: if a < max and b < max and a * b does not overflow, then max is maxMultiplier
    uint internal constant maxMultiplier = type(uint).max / 2 - 1;

    uint internal constant maxShare = one;

    // an address that receives a fee
    struct Beneficiary {
        address payable addr;
        uint share;
    }

    Beneficiary[] public beneficiaries;

    constructor(string memory name_, string memory symbol_, uint speed_, uint margin_, address payable[] memory beneficiaryAddrs_, uint[] memory beneficiaryShares_) ERC20(name_, symbol_) {
        require(margin_ < maxMultiplier, "Fairpool: royalty >= maxMultiplier");
        require(beneficiaryAddrs_.length == beneficiaryShares_.length, "Fairpool: benAddrs.len != benShares.len");
        speed = speed_;
        margin = margin_;
        uint sumOfShares;
        for (uint i = 0; i < beneficiaryAddrs_.length; i++) {
            address payable addr = beneficiaryAddrs_[i];
            uint share = beneficiaryShares_[i];
            require(share > 0, "Fairpool req: BS > 0");
            require(share < maxShare, "Fairpool req: BS < maxShare");
            beneficiaries.push(Beneficiary(addr, share));
            sumOfShares += share;
        }
        require(sumOfShares < maxShare, "Fairpool req: sumOfShares < maxShare arst arst art ars tar st arst arst");
        // TODO: Ensure beneficiaries contains our address & fee
    }

    function buy(uint baseDeltaMin, uint deadline) external payable nonReentrant {
        require(deadline >= block.timestamp, "Fairpool: deadline < block.timestamp");
        require(msg.value > 0, "Fairpool: msg.value == 0");
        uint quoteDelta = msg.value;
        uint profit = quoteDelta * margin / scale;
        uint remainder = distribute(profit);
        uint quoteAmount = quoteDelta - profit + remainder;
        uint baseDelta = getBaseDeltaBuy(quoteAmount);
        require(baseDelta >= baseDeltaMin, 'Fairpool: baseDelta < amountMin');
        _mint(msg.sender, baseDelta);
    }

    function sell(uint baseDelta, uint quoteDeltaMin, uint deadline) external nonReentrant {
        require(deadline >= block.timestamp, 'Fairpool: deadline < block.timestamp');
        require(baseDelta > 0, "Fairpool: baseDelta == 0");
        uint quoteDelta = getQuoteDeltaSell(baseDelta);
        require(quoteDelta >= quoteDeltaMin, 'Fairpool: totalDelta < totalMin');
        _burn(msg.sender, baseDelta);
    }

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
        uint baseFinal = quoteFinal.sqrt() * speed / scale;
        return baseFinal - baseAmount;
    }

    function getQuoteDeltaSell(uint baseDelta) internal view returns (uint quoteDelta) {
        uint quoteAmount = address(this).balance;
        uint baseAmount = totalSupply();
        uint quoteFinalSqrt = (baseAmount - baseDelta) * scale / speed;
        uint quoteFinal = quoteFinalSqrt * quoteFinalSqrt;
        return quoteAmount - quoteFinal;
    }

    /* Views */

    function beneficiariesLength() public view returns (uint) {
        return beneficiaries.length;
    }

    /* Pure functions */

    // ensures numerator is evenly divisible by denominator
    // may decrease numerator
    function roundBy(uint numerator, uint denominator) internal pure returns (uint numeratorEven) {
        return numerator / denominator * denominator;
    }

    /* Overrides */

    function _beforeTokenTransfer(
        address,
        address to,
        uint256
    ) internal virtual override {
        require(payable(to).send(0), "Fairpool: !payable(to)");
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
