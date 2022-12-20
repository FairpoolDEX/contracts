// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "solmate/src/utils/FixedPointMathLib.sol";
import "hardhat/console.sol";
import "./ERC20Enumerable.sol";
import "./SharedOwnership.sol";
import "./Util.sol";

/**
 * Definitions:
 * - base - token amount
 * - quote - money amount (native blockchain currency)
 *
 * Notes:
 * - quote = (base * base) * speed / scale; // the bonding curve equation (quote on the left side)
 * - base = (quote * scale / speed).sqrt(); // the bonding curve equation (base on the left side)
 * - price = quote / base = base * speed / scale; // the price equation
 * - The `_decimals` variable must be equal to the decimals of the base asset of the current blockchain (so that msg.value is scaled to this amount of decimals)
 * - Variables must use uint instead of smaller types because uint actually costs less gas
 * - Custom errors must be used over string descriptions because it costs less gas
 * - Custom errors must not include the function arguments (i.e. don't add function arguments as error parameters)
 * - Custom errors should be translated in UI
 * - Ownable is needed to allow changing the social media URLs (only owner could do this, and the owner can transfer ownership to a multisig for better security)
 * - Ownable is needed to change speed & tax (otherwise there could be a battle between the beneficiaries)
 */
contract Fairpool is ERC20Enumerable, SharedOwnership, ReentrancyGuard, Ownable {
    using FixedPointMathLib for uint;

    // Multiplier in the formula for base amount (as speed / scale)
    uint public speed;

    // Percentage of buy value that the contract distributes to the token holders & beneficiaries (as tax / scale)
    uint public tax;

    // Quote asset balances
    // NOTE: sum(totals) may increase without distribute() if someone simply transfers the underlying token to another person (by design, to pre-allocate the storage slot)
    mapping(address => uint) internal totals;

    // Allow up to 2 ** 32 unscaled
    uint internal constant maxSpeed = scale * (2 ** 32);

    // Allow up to 1 - (1 / scale) unscaled
    uint internal constant maxTax = scale - 1;

    // Incremental holder cost is ~11000 gas (with preallocation optimization)
    // Full distribution cost is ~11000 gas * 256 holders = ~2816000 gas
    uint internal constant maxHoldersPerDistribution = 256;

    uint internal constant minTotal = 1;

    /// Tax can't be greater or equal to maximum multiplier
    error TaxMustBeLessThanOrEqualToMaxTax();
    error SpeedMustBeLessThanOrEqualToMaxSpeed();
    error SpeedMustBeGreaterThanZero();
    error SpeedCanBeSetOnlyIfTotalSupplyIsZero();
    error BlockTimestampMustBeLessThanOrEqualToDeadline();
    error PaymentRequired();
    error BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(uint baseDelta);
    error QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(uint quoteDelta);
    error BaseDeltaProposedMustBeGreaterThanZero();
    error BaseDeltaProposedMustBeLessThanOrEqualToBalance();
    error NewTaxMustBeLessThanOldTax();
    error NothingToWithdraw();
    error AddressNotPayable(address addr);

    event Buy(address indexed addr, uint baseDelta, uint quoteDelta);
    event Sell(address indexed addr, uint baseDelta, uint quoteDelta, uint quoteReceived);
    event Withdraw(address indexed addr, uint quoteReceived);
    event SetSpeed(uint speed);
    event SetTax(uint tax);

    constructor(string memory name_, string memory symbol_, uint speed_, uint tax_, address payable[] memory beneficiaries_, uint[] memory shares_) ERC20(name_, symbol_) SharedOwnership(beneficiaries_, shares_) Ownable() {
        _setSpeed(speed_);
        _setTax(tax_);
    }

    function buy(uint baseDeltaMin, uint deadline) public virtual payable nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (msg.value == 0) revert PaymentRequired();
        (uint baseDelta, uint quoteDelta) = getBuyDeltas();
        if (baseDelta < baseDeltaMin) revert BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(baseDelta);
        uint quoteRefund = msg.value - quoteDelta;
        if (quoteRefund != 0) payable(msg.sender).transfer(quoteRefund);
        _mint(msg.sender, baseDelta);
        emit Buy(msg.sender, baseDelta, quoteDelta);
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (baseDeltaProposed == 0) revert BaseDeltaProposedMustBeGreaterThanZero();
        if (baseDeltaProposed > balanceOf(msg.sender)) revert BaseDeltaProposedMustBeLessThanOrEqualToBalance();
        (uint baseDelta, uint quoteDelta) = getSellDeltas(baseDeltaProposed);
        _burn(msg.sender, baseDelta);
        uint quoteReceived;
        if (tax == 0) {
            quoteReceived = quoteDelta;
        } else {
            uint profit = (quoteDelta * tax) / scale;
            uint remainder = distribute(profit);
            quoteReceived = quoteDelta - profit + remainder;
        }
        if (quoteReceived < quoteReceivedMin) revert QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(quoteReceived);
        payable(msg.sender).transfer(quoteReceived);
        emit Sell(msg.sender, baseDelta, quoteDelta, quoteReceived);
    }

    function withdraw() public virtual nonReentrant {
        uint total = totals[msg.sender];
        if (total <= minTotal) revert NothingToWithdraw();
        totals[msg.sender] = minTotal;
        // NOTE: This is a potential contract call
        payable(msg.sender).transfer(total - minTotal);
        emit Withdraw(msg.sender, total - minTotal);
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

    function setSpeed(uint speed_) external onlyOwner nonReentrant {
        if (totalSupply() != 0) revert SpeedCanBeSetOnlyIfTotalSupplyIsZero();
        _setSpeed(speed_);
        emit SetSpeed(speed_);
    }

    function setTax(uint tax_) external onlyOwner nonReentrant {
        if (tax_ >= tax) revert NewTaxMustBeLessThanOldTax();
        _setTax(tax_);
        emit SetTax(tax_);
    }

    function _setSpeed(uint speed_) internal {
        if (speed_ == 0) revert SpeedMustBeGreaterThanZero();
        if (speed_ > maxSpeed) revert SpeedMustBeLessThanOrEqualToMaxSpeed();
        speed = speed_;
    }

    function _setTax(uint tax_) internal {
        // [not needed] if (tax_ == 0) revert TaxMustBeGreaterThanZero();
        if (tax_ > maxTax) revert TaxMustBeLessThanOrEqualToMaxTax();
        tax = tax_;
    }


    /* Internal functions */

    /**
     * Distributes profit between beneficiaries and holders
     * Beneficiaries receive shares of profit
     * Holders receive shares of profit remaining after beneficiaries
     */
    function distribute(uint profit) internal returns (uint remainder) {
        uint beneficiariesLength = beneficiaries.length;
        uint holdersLength = holders.length;
        uint maxHolders = holders.length < maxHoldersPerDistribution ? holders.length : maxHoldersPerDistribution;
        uint baseOffset = getRandom(profit) % holders.length; // 0 <= offset < holders.length
        uint offset;
        uint i;
        uint total;
        address recipient;

        uint sumOfBeneficiaryTotals;
        for (i = 0; i < beneficiariesLength; i++) {
            recipient = beneficiaries[i];
            total = getShareAmount(profit, recipient);
            // NOTE: we should not check that send has succeeded because otherwise a malicious user would be able to brick the contract by deploying a contract with a reverting payable fallback function
            totals[recipient] += total;
            sumOfBeneficiaryTotals += total;
        }
        profit -= sumOfBeneficiaryTotals;

        // NOTE: It's OK to use a separate loop to calculate localTotalSupply because the gas cost is much lower if you access the same storage slot multiple times within transaction
        uint localTotalSupply;
        for (i = 0; i < maxHolders; i++) {
            offset = addmod(baseOffset, i, holdersLength);
            localTotalSupply += balanceOf(holders[offset]);
        }

        uint sumOfHolderTotals;
        for (i = 0; i < maxHolders; i++) {
            offset = addmod(baseOffset, i, holdersLength);
            recipient = holders[offset];
            total = (profit * balanceOf(recipient)) / localTotalSupply;
            totals[recipient] += total; // always 5000 gas, since we preallocate the storage slot in _afterTokenTransfer
            sumOfHolderTotals += total;
        }
        profit -= sumOfHolderTotals;

        return profit;
    }

    // IMPORTANT: "When a payable function is called: address(this).balance is increased by msg.value before any of your code is executed", so quoteNew should already include the msg.value
    // IMPORTANT: buy deltas must be added, not subtracted from current amounts
    function getBuyDeltas() internal view returns (uint baseDelta, uint quoteDelta) {
        uint baseOld = totalSupply();
        uint quoteOld = address(this).balance - msg.value;
        uint quoteNewProposed = address(this).balance;
        uint baseNewProposed = getBase(quoteNewProposed);
        uint baseNew = downscale(baseNewProposed);
        uint quoteNew = getQuote(baseNew);
        return (baseNew - baseOld, quoteNew - quoteOld);
    }

    // IMPORTANT: sell deltas must be subtracted, not added to current amounts
    function getSellDeltas(uint baseDeltaProposed) internal view returns (uint baseDelta, uint quoteDelta) {
        uint baseOld = totalSupply();
        uint quoteOld = address(this).balance;
        uint baseNew = upscale(baseOld - baseDeltaProposed); // using upscale instead of downscale to ensure that `(baseOld - baseNew) < baseDeltaProposed` (because we're returning deltas to be subtracted, not added)
        uint quoteNew = getQuote(baseNew);
        return (baseOld - baseNew, quoteOld - quoteNew);
    }

    function getQuote(uint base) internal view returns (uint quote) {
        return base * base * speed / scale;
    }

    function getBase(uint quote) internal view returns (uint base) {
        return (quote * scale / speed).sqrt();
    }

    // turn value into smaller $value that is divisible by scale without remainder (value > $value)
    function downscale(uint value) internal pure returns (uint $value) {
        return value / scale * scale;
    }

    // turn value into larger $value that is divisible by scale without remainder (value < $value)
    function upscale(uint value) internal pure returns (uint $value) {
        return (value / scale + 1) * scale;
    }

    /* View functions */

    function totalOf(address account) public view returns (uint) {
        return totals[account];
    }

    /**
     * This PRNG is potentially insecure. However, it is only used to determine the base offset for the profit distribution. The only people who can benefit from gaming this function are current token holders (note that the seller is not included in the distribution because the _burn() is called before distribution()). Gaming this function requires collaboration between a miner and a seller, and only benefits multiple existing token holders. Therefore, we think that the risk of manipulation is low.
     */
    function getRandom(uint input) internal view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty, blockhash(block.number - 1), msg.sender, input)));
    }

    /* Pure functions */

    /* Override functions */

    function _beforeTokenTransfer(
        address,
        address to,
        uint256
    ) internal virtual override {
        // [not needed] super._beforeTokenTransfer(from, to, amount);
        // check that address is payable before transferring the tokens, otherwise distribute() will revert for everyone
        // source: https://ethereum.stackexchange.com/a/123679
        // slither-disable-next-line arbitrary-send-eth
        if (!payable(to).send(0)) revert AddressNotPayable(to);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._afterTokenTransfer(from, to, amount);
        // preallocate the storage slot to save on gas in the distribute() loop
        // minTotal is subtracted in withdraw()
        if (from == to || amount == 0) {
            return;
        }
        if (from != address(0) && balanceOf(from) == 0 && totals[from] == minTotal) {
            delete totals[from];
        }
        if (to != address(0) && balanceOf(to) != 0 && totals[to] == 0) {
            totals[to] = minTotal;
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
