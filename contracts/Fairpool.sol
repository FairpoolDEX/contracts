// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "solmate/src/utils/FixedPointMathLib.sol";
import "./ERC20Enumerable.sol";
import "./SharedOwnership.sol";

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
 * - Owner may call renounceOwnership(), thus setting the owner to zero address
 * - sell() may increase tallies[msg.sender] (if the seller address is included in the distribution of dividends). This is desirable because of 1) lower gas cost (no need to check if address != msg.sender) 2) correct behavior in the limit case where the seller is the only remaining holder (he should not pay dividends to anyone else ~= he should pay dividends to himself)
 * - payable(msg.sender).transfer() are potential contract calls (revert on failure)
 * - baseNew is always divisible by scale without remainder (due to upscale() / downscale())
 * - quoteNew is always divisible by scale without remainder (due to getQuote(baseNew) )
 * - baseDelta is always divisible by scale without remainder (due to baseNew - baseOld / baseOld - baseNew)
 * - quoteDelta is always divisible by scale without remainder (due to quoteNew - quoteOld / quoteOld - quoteNew)
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

    // Percentage of sale distributed to the operator (as fees / scale)
    uint public fees = scale * 25 / 1000; // 2.5%

    // Operator receives the fees
    address payable public operator = payable(0x7554140235ad2D1Cc75452D2008336700C598Dc1);

    // Quote asset balances available for withdrawal
    // IMPORTANT: Due to preallocation, sum(tallies) may increase without distribute() if someone simply transfers the underlying token to another person (by design, to preallocate the storage slot)
    // IMPORTANT: There's no deallocation: every address that has been a holder or a beneficiary in the past will always have tallies[address] >= defaultTally
    // `if (balanceOf(address) == 0) then (tallies[address] == 0)` => false, because beneficiaries may receive tallies while their balances are zero
    // `if (balanceOf(address) != 0) then (tallies[address] == defaultTally || tallies[address] > defaultTally)` => true, because of preallocation
    mapping(address => uint) internal tallies;

    // Real balance of contract (less than or equal to `address(this).balance - sum(tallies) - defaultTally * holders.length`)
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
    error RoyaltiesPlusDividendsPlusFeesMustBeLessThanScale();
    error NewTaxesMustBeLessThanOrEqualToOldTaxesOrTotalSupplyMustBeZero();
    error OnlyOperator();
    error OperatorMustNotBeZeroAddress();
    error OperatorMustNotBeContractAddress();

    event Trade(address indexed sender, bool isBuy, uint baseDelta, uint quoteDelta, uint quoteReceived);
    event Withdraw(address indexed sender, uint quoteReceived);
    event SetSpeed(uint speed);
    event SetRoyalties(uint royalties);
    event SetDividends(uint dividends);
    event SetFees(uint fees);
    event SetOperator(address operator);

    constructor(string memory name_, string memory symbol_, uint speed_, uint royalties_, uint dividends_, address payable[] memory beneficiaries_, uint[] memory shares_) ERC20(name_, symbol_) SharedOwnership(beneficiaries_, shares_) Ownable() {
        setSpeedInternal(speed_);
        setTaxesInternal(royalties_, dividends_, fees);
        // operator is already set
        // preallocate tallies
        for (uint i = 0; i < beneficiaries.length; i++) {
            tallies[beneficiaries[i]] = defaultTally;
        }
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
        emit Trade(msg.sender, true, baseDelta, quoteDelta, 0);
        _mint(msg.sender, baseDelta);
        quoteBalanceOfContract += quoteDelta;
        if (quoteRefund != 0) payable(msg.sender).transfer(quoteRefund);
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual nonReentrant returns (uint quoteDistributed) {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (baseDeltaProposed > balanceOf(msg.sender)) revert BaseDeltaProposedMustBeLessThanOrEqualToBalance();
        (uint baseDelta, uint quoteDelta) = getSellDeltas(baseDeltaProposed);
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        // baseDelta != 0 ==> quoteDelta != 0
        _burn(msg.sender, baseDelta);
        quoteBalanceOfContract -= quoteDelta;
        quoteDistributed = distribute(quoteDelta);
        uint quoteReceived = quoteDelta - quoteDistributed;
        if (quoteReceived < quoteReceivedMin) revert QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(quoteReceived);
        emit Trade(msg.sender, false, baseDelta, quoteDelta, quoteReceived);
        uint quoteWithdrawn = doWithdrawAndEmit();
        payable(msg.sender).transfer(quoteReceived + quoteWithdrawn);
    }

    function withdraw() public virtual nonReentrant {
        uint quoteWithdrawn = doWithdrawAndEmit();
        if (quoteWithdrawn == 0) revert NothingToWithdraw();
        payable(msg.sender).transfer(quoteWithdrawn);
    }

    function doWithdrawAndEmit() internal returns (uint quoteWithdrawn) {
        if (tallies[msg.sender] > defaultTally) {
            quoteWithdrawn = tallies[msg.sender] - defaultTally;
            emit Withdraw(msg.sender, quoteWithdrawn);
            tallies[msg.sender] = defaultTally;
        } else {
            quoteWithdrawn = 0;
        }
    }

    function setSpeed(uint $speed) external onlyOwner nonReentrant {
        if (totalSupply() != 0) revert SpeedCanBeSetOnlyIfTotalSupplyIsZero();
        setSpeedInternal($speed);
        emit SetSpeed($speed);
    }

    function setRoyalties(uint $royalties) external onlyOwner nonReentrant {
        setTaxesInternal($royalties, dividends, fees);
        emit SetRoyalties($royalties);
    }

    function setDividends(uint $dividends) external onlyOwner nonReentrant {
        setTaxesInternal(royalties, $dividends, fees);
        emit SetDividends($dividends);
    }

    function setFees(uint $fees) external onlyOperator nonReentrant {
        setTaxesInternal(royalties, dividends, $fees);
        emit SetFees($fees);
    }

    function setOperator(address payable $operator) external onlyOperator nonReentrant {
        setOperatorInternal($operator);
        emit SetOperator($operator);
    }

    function setSpeedInternal(uint $speed) internal {
        if ($speed == 0) revert SpeedMustBeGreaterThanZero();
        if ($speed > maxSpeed) revert SpeedMustBeLessThanOrEqualToMaxSpeed();
        speed = $speed;
    }

    function setOperatorInternal(address payable $operator) internal {
        if ($operator == address(0)) revert OperatorMustNotBeZeroAddress();
        if ($operator == address(this)) revert OperatorMustNotBeContractAddress();
        operator = $operator;
    }

    // using a single function for all three taxes to ensure their sum < scale (revert otherwise)
    function setTaxesInternal(uint $royalties, uint $dividends, uint $fees) internal {
        // checking each value separately first to ensure the sum doesn't overflow (otherwise Echidna reports an overflow)
        if ($royalties >= scale || $dividends >= scale || $fees >= scale || $royalties + $dividends + $fees >= scale) revert RoyaltiesPlusDividendsPlusFeesMustBeLessThanScale();
        if (totalSupply() != 0 && ($royalties > royalties || $dividends > dividends || $fees > fees)) revert NewTaxesMustBeLessThanOrEqualToOldTaxesOrTotalSupplyMustBeZero();
        royalties = $royalties;
        dividends = $dividends;
        fees = $fees;
    }

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

        uint quoteDistributedToOperator = (quoteDelta * fees) / scale;
        if (quoteDistributedToOperator != 0) {
            operator.transfer(quoteDistributedToOperator);
            quoteDistributed += quoteDistributedToOperator;
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

    modifier onlyOperator() {
        if (msg.sender != operator) revert OnlyOperator();
        _;
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
        if (to != address(0) && balanceOf(to) != 0) {
            preallocate(to);
        }
    }

    function addBeneficiary(address target) internal virtual override {
        super.addBeneficiary(target);
        preallocate(target);
    }

    function preallocate(address target) internal {
        // `if` is necessary to prevent overwriting an existing positive tally
        if (tallies[target] == 0) tallies[target] = defaultTally;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
