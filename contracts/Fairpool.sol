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
 * - Custom errors can have names of any length (the resulting selector is always 4 bytes)
 * - Ownable is needed to allow changing the social media URLs (only owner could do this, and the owner can transfer ownership to a multisig for better security)
 * - Ownable is needed to change speed & tax (otherwise there could be a battle between the beneficiaries)
 * - sell() may increase tallies[msg.sender] (if the seller address is included in the distribution of dividends). This is desirable because of 1) lower gas cost (no need to check if address != msg.sender) 2) correct behavior in the limit case where the seller is the only remaining holder (he should not pay dividends to anyone else ~= he should pay dividends to himself)
 */
contract Fairpool is ERC20Enumerable, SharedOwnership, ReentrancyGuard, Ownable {
    using FixedPointMathLib for uint;

    // Multiplier in the formula for base amount (as speed / scale)
    uint public speed;

    // Percentage of sale distributed to the beneficiaries (as royalties / scale)
    uint public royalties;

    // Percentage of sale distributed to the holders (as dividends / scale)
    // NOTE: can be set to zero to avoid the dividends
    uint public dividends;

    // Quote asset balances available for withdrawal
    // NOTE: sum(tallies) may increase without distribute() if someone simply transfers the underlying token to another person (by design, to pre-allocate the storage slot)
    mapping(address => uint) internal tallies;

    // Real balance of contract (must be equal to address(this).balance - sum(tallies) - )
    uint public quoteBalanceOfContract;

    // Allow up to 2 ** 32 unscaled
    uint internal constant maxSpeed = scale * (2 ** 32);

    // Allow up to 1 - (1 / scale) unscaled
    uint internal constant maxRoyalties = scale - 1;

    // Incremental holder cost is ~11000 gas (with preallocation optimization)
    // Full distribution cost is ~11000 gas * 256 holders = ~2816000 gas
    uint internal constant maxHoldersPerDistribution = 256;

    // used for preallocation: it is set on tallies for every holder
    uint internal constant defaultTally = 1;

    error BlockTimestampMustBeLessThanOrEqualToDeadline();
    error PaymentRequired();
    error BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(uint baseDelta);
    error QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(uint quoteDelta);
    error BaseDeltaMustBeGreaterThanZero();
    error BaseDeltaProposedMustBeLessThanOrEqualToBalance();
    error NothingToWithdraw();
    error AddressNotPayable(address addr);
    error SpeedMustBeLessThanOrEqualToMaxSpeed();
    error SpeedMustBeGreaterThanZero();
    error SpeedCanBeSetOnlyIfTotalSupplyIsZero();
    error RoyaltiesPlusDividendsMustBeLessThanScale();
    error NewRoyaltiesMustBeLessThanOldRoyaltiesOrTotalSupplyMustBeZero();
    error NewDividendsMustBeLessThanOldDividendsOrTotalSupplyMustBeZero();

    event Buy(address indexed addr, uint baseDelta, uint quoteDelta);
    event Sell(address indexed addr, uint baseDelta, uint quoteDelta, uint quoteReceived);
    event Withdraw(address indexed addr, uint quoteReceived);
    event SetSpeed(uint speed);
    event SetRoyalties(uint royalties);
    event SetDividends(uint dividends);

    constructor(string memory name_, string memory symbol_, uint speed_, uint royalties_, uint dividends_, address payable[] memory beneficiaries_, uint[] memory shares_) ERC20(name_, symbol_) SharedOwnership(beneficiaries_, shares_) Ownable() {
        setSpeedInternal(speed_);
        setRoyaltiesInternal(royalties_);
        setDividendsInternal(dividends_);
    }

    function buy(uint baseDeltaMin, uint deadline) public virtual payable nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (msg.value == 0) revert PaymentRequired();
        (uint baseDelta, uint quoteDelta) = getBuyDeltas();
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        // baseDelta != 0 ==> quoteDelta != 0
        if (baseDelta < baseDeltaMin) revert BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(baseDelta);
        uint quoteRefund = msg.value - quoteDelta;
        if (quoteRefund != 0) payable(msg.sender).transfer(quoteRefund);
        _mint(msg.sender, baseDelta);
        quoteBalanceOfContract += quoteDelta;
        emit Buy(msg.sender, baseDelta, quoteDelta);
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (baseDeltaProposed > balanceOf(msg.sender)) revert BaseDeltaProposedMustBeLessThanOrEqualToBalance();
        (uint baseDelta, uint quoteDelta) = getSellDeltas(baseDeltaProposed);
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        // baseDelta != 0 ==> quoteDelta != 0
        _burn(msg.sender, baseDelta);
        quoteBalanceOfContract -= quoteDelta;
        uint quoteReceived = quoteDelta - distribute(quoteDelta);
        if (quoteReceived < quoteReceivedMin) revert QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(quoteReceived);
        payable(msg.sender).transfer(quoteReceived);
        emit Sell(msg.sender, baseDelta, quoteDelta, quoteReceived);
    }

    function withdraw() public virtual nonReentrant {
        if (tallies[msg.sender] <= defaultTally) revert NothingToWithdraw();
        uint amount = tallies[msg.sender] - defaultTally;
        tallies[msg.sender] = defaultTally;
        // NOTE: This is a potential contract call (reverts on failure)
        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

    // saves 30907 gas compared to separate sell() + withdraw() transactions
    // may be optimized further by bundling two transfer() calls into one
    function sellAndWithdraw(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual {
        sell(baseDeltaProposed, quoteReceivedMin, deadline);
        withdraw();
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
        setSpeedInternal(speed_);
        emit SetSpeed(speed_);
    }

    function setRoyalties(uint royalties_) external onlyOwner nonReentrant {
        if (totalSupply() != 0 && royalties_ >= royalties) revert NewRoyaltiesMustBeLessThanOldRoyaltiesOrTotalSupplyMustBeZero();
        setRoyaltiesInternal(royalties_);
        emit SetRoyalties(royalties_);
    }

    function setDividends(uint dividends_) external onlyOwner nonReentrant {
        if (totalSupply() != 0 && dividends_ >= dividends) revert NewDividendsMustBeLessThanOldDividendsOrTotalSupplyMustBeZero();
        setDividendsInternal(dividends_);
        emit SetDividends(dividends_);
    }

    function setSpeedInternal(uint speed_) internal {
        if (speed_ == 0) revert SpeedMustBeGreaterThanZero();
        if (speed_ > maxSpeed) revert SpeedMustBeLessThanOrEqualToMaxSpeed();
        speed = speed_;
    }

    // royalties_ can be 0
    function setRoyaltiesInternal(uint royalties_) internal {
        unchecked { // using manual overflow check because otherwise Echidna reports an error
            uint sum = royalties_ + dividends;
            if (/* overflow */ sum < dividends || sum >= scale) revert RoyaltiesPlusDividendsMustBeLessThanScale();
            royalties = royalties_;
        }
    }

    // dividends_ can be 0
    function setDividendsInternal(uint dividends_) internal {
        unchecked { // using manual overflow check because otherwise Echidna reports an error
            uint sum = dividends_ + royalties;
            if (/* overflow */ sum < royalties || sum >= scale) revert RoyaltiesPlusDividendsMustBeLessThanScale();
            dividends = dividends_;
        }
    }


    /* Internal functions */

    /**
     * Distributes profit between beneficiaries and holders
     * Beneficiaries receive shares of profit
     * Holders receive shares of profit remaining after beneficiaries
     */
    function distribute(uint quoteDelta) internal returns (uint quoteDistributed) {
        // common loop variables
        uint i;
        uint length;
        uint total;
        address recipient;

        // distribute to beneficiaries
        uint quoteDistributedToBeneficiaries = (quoteDelta * royalties) / scale;
        if (quoteDistributedToBeneficiaries != 0) {
            length = beneficiaries.length;
            for (i = 0; i < length; i++) {
                recipient = beneficiaries[i];
                total = getShareAmount(quoteDistributedToBeneficiaries, recipient);
                tallies[recipient] += total;
                quoteDistributed += total;
            }
        }

        // distribute to holders
        uint quoteDistributedToHolders = (quoteDelta * dividends) / scale;
        if (quoteDistributedToHolders != 0) {
            length = holders.length;
            uint maxHolders = length < maxHoldersPerDistribution ? length : maxHoldersPerDistribution;
            uint baseOffset = getRandom(quoteDistributedToHolders) % holders.length; // 0 <= offset < holders.length
            uint offset;
            uint localTotalSupply;
            // NOTE: It's OK to use a separate loop to calculate localTotalSupply because the gas cost is much lower if you access the same storage slot multiple times within transaction
            for (i = 0; i < maxHolders; i++) {
                offset = addmod(baseOffset, i, length); // calculating offset with wrap-around
                localTotalSupply += balanceOf(holders[offset]);
            }
            for (i = 0; i < maxHolders; i++) {
                offset = addmod(baseOffset, i, length); // calculating offset with wrap-around
                recipient = holders[offset];
                total = (quoteDistributedToHolders * balanceOf(recipient)) / localTotalSupply;
                tallies[recipient] += total; // always 5000 gas, since we preallocate the storage slot in _afterTokenTransfer
                quoteDistributed += total;
            }
        }
    }

    // IMPORTANT: "When a payable function is called: address(this).balance is increased by msg.value before any of your code is executed", so quoteNew should already include the msg.value
    // IMPORTANT: Buy deltas must be added, not subtracted from current amounts
    function getBuyDeltas() internal view returns (uint baseDelta, uint quoteDelta) {
        uint baseOld = totalSupply();
        uint quoteOld = quoteBalanceOfContract;
        uint quoteNewProposed = quoteOld + msg.value;
        uint baseNewProposed = getBase(quoteNewProposed);
        uint baseNew = downscale(baseNewProposed);
        uint quoteNew = getQuote(baseNew);
        if (baseNew < baseOld) { // may happen because of downscale()
            return (0, 0);
        } else {
            return (baseNew - baseOld, quoteNew - quoteOld);
        }
    }

    // IMPORTANT: Sell deltas must be subtracted, not added to current amounts
    function getSellDeltas(uint baseDeltaProposed) internal view returns (uint baseDelta, uint quoteDelta) {
        uint baseOld = totalSupply();
        uint quoteOld = quoteBalanceOfContract;
        uint baseNew = upscale(baseOld - baseDeltaProposed); // using upscale instead of downscale to ensure that `(baseOld - baseNew) < baseDeltaProposed` (because we're returning deltas to be subtracted, not added)
        uint quoteNew = getQuote(baseNew);
        if (baseOld < baseNew) { // may happen because of upscale() if baseDeltaProposed is very small
            return (0, 0);
        } else {
            return (baseOld - baseNew, quoteOld - quoteNew);
        }
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

    function withdrawable(address account) public view returns (uint) {
        return (tallies[account] <= defaultTally) ? 0 : tallies[account] - defaultTally;
    }

    /**
     * This PRNG is potentially insecure. However, it is only used to determine the base offset for the profit distribution. The only people who can benefit from gaming this function are current token holders (note that the seller is not included in the distribution because the _burn() is called before distribute()). Gaming this function requires collaboration between a miner and a seller, and only benefits multiple existing token holders. Therefore, we think that the risk of manipulation is low.
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
        if (from != address(0) && balanceOf(from) == 0 && tallies[from] == defaultTally) {
            delete tallies[from];
        }
        if (to != address(0) && balanceOf(to) != 0 && tallies[to] == 0) {
            tallies[to] = defaultTally;
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
