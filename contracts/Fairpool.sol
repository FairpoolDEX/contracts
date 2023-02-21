// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ERC20Enumerable.sol";
import "./SharedOwnership.sol";
import "./Util.sol";
import "./Recoverable.sol";
import "hardhat/console.sol";

/**
 * Definitions:
 * - base - token amount
 * - quote - money amount (native blockchain currency)
 *
 * Notes:
 * - Variables must use uint instead of smaller types (uint actually costs less gas)
 * - Custom errors must be used over string descriptions (it costs less gas)
 * - Custom errors must not include the function arguments (i.e. don't add function arguments as error parameters)
 * - Custom errors should be translated in UI
 * - Custom errors may have names of any length (the resulting selector is always 4 bytes)
 * - Ownable is needed to allow changing the social media URLs (only owner could do this, and the owner can transfer ownership to a multisig for better security)
 * - Ownable is needed to change curve parameters & taxes (otherwise there could be a battle between the beneficiaries)
 * - Owner may call renounceOwnership(), thus setting the owner to zero address
 * - payable(msg.sender).transfer() are potential contract calls (revert on failure)
 */
contract Fairpool is ERC20Enumerable, SharedOwnership, Recoverable, ReentrancyGuard, Ownable {
    // Maximum totalSupply(), used in getBuyDeltas() and getSellDeltas()
    uint public baseLimit;

    // Simulated quote supply, used in getBuyDeltas() and getSellDeltas(), calculated as baseLimit * initialPrice, stored instead of initialPrice because get*Deltas() require it
    uint public quoteOffset;

    uint internal constant baseLimitMin = 1000;

    uint internal constant baseLimitMax = type(uint128).max;

    uint internal constant quoteOffsetMin = baseLimitMin * 2;

    uint internal constant quoteOffsetMax = baseLimitMax;

    // Decimals count (set once in the constructor)
    uint8 internal immutable precision;

    // Percentage of sale distributed to the beneficiaries (as royalties / scaleOfShares)
    uint public royalties;

    // Percentage of sale distributed to the holders (as earnings / scaleOfShares)
    // NOTE: can be set to zero to avoid the earnings
    uint public earnings;

    // Percentage of sale distributed to the operator (as fees / scaleOfShares)
    uint public fees = scaleOfShares * 25 / 1000; // 2.5%

    // Operator receives the fees
    address payable public operator = payable(0x7554140235ad2D1Cc75452D2008336700C598Dc1);

    // Quote asset balances available for withdrawal
    // IMPORTANT: Due to preallocation, sum(tallies) may increase without distribute() if someone simply transfers the underlying token to another person (by design, to preallocate the storage slot)
    // IMPORTANT: There's no deallocation: every address that has been a holder or a beneficiary in the past will always have tallies[address] >= defaultTally
    // `if (balanceOf(address) == 0) then (tallies[address] == 0)` => false, because beneficiaries may receive tallies while their balances are zero
    // `if (balanceOf(address) != 0) then (tallies[address] == defaultTally || tallies[address] > defaultTally)` => true, because of preallocation
    mapping(address => uint) internal tallies;

    // Real balance of contract (less than or equal to `address(this).balance - sum(tallies) - defaultTally * holders.length`)
    // Needed to allow lazy withdrawals (no need to send transfers to every tax recipient in sell(), so the real balance of the contract is higher than quoteBalanceOfContract)
    // Also needed to protect against breaking the contract logic by sending the quote currency to it directly
    uint public quoteBalanceOfContract;

    // Incremental holder cost is ~11000 gas (with preallocation optimization)
    // Full distribution cost is ~11000 gas * 256 holders = ~2816000 gas
    uint internal constant maxHoldersPerDistribution = 256;

    // Used for preallocation: it is set on tallies for every holder
    uint internal constant defaultTally = 1;

    error BlockTimestampMustBeLessThanOrEqualToDeadline();
    error QuoteDeltaMustBeGreaterThanOrEqualTo2xScaleOfShares();
    error QuoteDeltaMustBeGreaterThanOrEqualToScaleOfShares();
    error BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(uint baseDelta);
    error QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(uint quoteDelta);
    error BaseDeltaMustBeGreaterThanZero();
    error BaseDeltaProposedMustBeLessThanOrEqualToBalance();
    error NothingToWithdraw();
    error AddressNotPayable(address addr);
    error BaseLimitMustBeGreaterOrEqualToBaseLimitMin();
    error BaseLimitMustBeLessOrEqualToBaseLimitMax();
    error QuoteOffsetMustBeGreaterOrEqualToQuoteOffsetMin();
    error QuoteOffsetMustBeLessOrEqualToQuoteOffsetMax();
    error QuoteOffsetMustBeDivisibleByBaseLimit();
    error QuoteOffsetMustBeGreaterThanBaseLimit();
    error CurveParametersCanBeSetOnlyIfTotalSupplyIsZero();
    error EarningsCanBeSetOnlyIfTotalSupplyIsZero();
    error RoyaltiesPlusEarningsPlusFeesMustBeLessThanScaleOfShares();
    error NewTaxesMustBeLessThanOrEqualToOldTaxesOrTotalSupplyMustBeZero();
    error OnlyOperator();
    error OperatorMustNotBeZeroAddress();
    error OperatorMustNotBeContractAddress();
    error ToAddressMustBeNotEqualToThisContractAddress();

    event Trade(address indexed sender, bool isBuy, uint baseDelta, uint quoteDelta, uint quoteReceived);
    event Withdraw(address indexed sender, uint quoteReceived);
    event SetBaseLimit(uint baseLimit);
    event SetQuoteOffset(uint quoteOffset);
    event SetRoyalties(uint royalties);
    event SetEarnings(uint earnings);
    event SetFees(uint fees);
    event SetOperator(address operator);

    constructor(string memory nameNew, string memory symbolNew, uint baseLimitNew, uint quoteOffsetNew, uint8 precisionNew, uint royaltiesNew, uint earningsNew, address payable[] memory beneficiariesNew, uint[] memory sharesNew) ERC20(nameNew, symbolNew) SharedOwnership(beneficiariesNew, sharesNew) Ownable() {
        precision = precisionNew;
        setCurveParametersInternal(baseLimitNew, quoteOffsetNew);
        setTaxesInternal(royaltiesNew, earningsNew, fees /* using the old fees variable because it shouldn't be changed by the contract deployer */);
        // operator is already set
        // preallocate tallies
        for (uint i = 0; i < beneficiaries.length; i++) {
            tallies[beneficiaries[i]] = defaultTally;
        }
    }

    function buy(uint baseDeltaMin, uint deadline) public virtual payable nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        (uint baseDelta, uint quoteDelta) = getBuyDeltas(msg.value);
        // `quoteDelta < 2 * scaleOfShares` is needed because quoteDelta must be divisible by scaleOfShares in distribute()
        // using `2 * scaleOfShares` instead of `scaleOfShares` because sell() calls saleTargetAmount(), which returns a smaller quoteDelta than was initially passed to buy() as msg.value
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        if (quoteDelta < 2 * scaleOfShares) revert QuoteDeltaMustBeGreaterThanOrEqualTo2xScaleOfShares();
        if (baseDelta < baseDeltaMin) revert BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(baseDelta);
        emit Trade(msg.sender, true, baseDelta, quoteDelta, 0);
        _mint(msg.sender, baseDelta);
        quoteBalanceOfContract += quoteDelta;
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual nonReentrant returns (uint quoteDistributed) {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (baseDeltaProposed > balanceOf(msg.sender)) revert BaseDeltaProposedMustBeLessThanOrEqualToBalance();
        (uint baseDelta, uint quoteDelta) = getSellDeltas(baseDeltaProposed);
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        if (quoteDelta < scaleOfShares) revert QuoteDeltaMustBeGreaterThanOrEqualToScaleOfShares();
        quoteBalanceOfContract -= quoteDelta;
        quoteDistributed = distribute(quoteDelta);
        uint quoteReceived = quoteDelta - quoteDistributed;
        if (quoteReceived < quoteReceivedMin) revert QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(quoteReceived);
        _burn(msg.sender, baseDelta); // IMPORTANT: _burn() must be called after distribute() because holders.length must be greater than 0 (a single holder must be able to sell back & receive earnings for himself)
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

    function getBaseSupply(uint quoteSupply) internal view returns (uint baseSupply) {
        baseSupply = baseLimit * quoteSupply / (quoteOffset + quoteSupply);
        assert(baseSupply < baseLimit); // baseLimit must never be reached
    }

    function getQuoteSupply(uint baseSupply) internal view returns (uint quoteSupply) {
        quoteSupply = quoteOffset * baseSupply / (baseLimit + baseSupply);
        assert(baseSupply < baseLimit); // baseLimit must never be reached
    }

    /**
     * Notes:
     * - This function may return (0, 0). The caller must check for this case & throw an error if this is undesirable.
     * - "baseSupplyOld" is "totalSupply()"
     * - "quoteSupplyOld" is "quoteBalanceOfContract"
     */
    function getBuyDeltas(uint quoteDeltaProposed) internal returns (uint baseDelta, uint quoteDelta) {
        uint quoteSupplyProposed = quoteBalanceOfContract + quoteDeltaProposed;
        uint baseSupplyNew = getBaseSupply(quoteSupplyProposed);
        uint quoteSupplyNew = getQuoteSupply(baseSupplyNew); // ensure that quoteSupply is always calculated precisely from baseSupply
        assert(quoteSupplyNew <= quoteSupplyProposed); // due to integer division
        baseDelta = baseSupplyNew - totalSupply();
        quoteDelta = quoteSupplyNew - quoteBalanceOfContract;
    }

    /**
     * Notes:
     * - This function may return (0, 0) if and only if baseDeltaProposed == 0
     * - "baseSupplyOld" is "totalSupply()"
     * - "quoteSupplyOld" is "quoteBalanceOfContract"
     */
    function getSellDeltas(uint baseDeltaProposed) internal returns (uint baseDelta, uint quoteDelta) {
        uint baseSupplyProposed = totalSupply() - baseDeltaProposed;
        uint quoteSupplyProposed = getQuoteSupply(baseSupplyProposed);
        baseDelta = totalSupply() - baseSupplyProposed;
        quoteDelta = quoteBalanceOfContract - quoteSupplyProposed;
    }

    function setCurveParameters(uint baseLimitNew, uint quoteOffsetNew) external onlyOwner nonReentrant {
        if (totalSupply() != 0) revert CurveParametersCanBeSetOnlyIfTotalSupplyIsZero();
        setCurveParametersInternal(baseLimitNew, quoteOffsetNew);
        emit SetBaseLimit(baseLimitNew);
        emit SetQuoteOffset(quoteOffsetNew);
    }

    // using separate setRoyalties, setEarnings, setFees because they have different modifiers (onlyOwner vs onlyOperator)

    function setRoyalties(uint royaltiesNew) external onlyOwner nonReentrant {
        setTaxesInternal(royaltiesNew, earnings, fees);
        emit SetRoyalties(royaltiesNew);
    }

    function setEarnings(uint earningsNew) external onlyOwner nonReentrant {
        if (totalSupply() != 0) revert EarningsCanBeSetOnlyIfTotalSupplyIsZero();
        setTaxesInternal(royalties, earningsNew, fees);
        emit SetEarnings(earningsNew);
    }

    function setFees(uint feesNew) external onlyOperator nonReentrant {
        setTaxesInternal(royalties, earnings, feesNew);
        emit SetFees(feesNew);
    }

    function setOperator(address payable operatorNew) external onlyOperator nonReentrant {
        setOperatorInternal(operatorNew);
        emit SetOperator(operatorNew);
    }

    function setCurveParametersInternal(uint baseLimitNew, uint quoteOffsetNew) internal {
        if (baseLimitNew < baseLimitMin) revert BaseLimitMustBeGreaterOrEqualToBaseLimitMin();
        if (baseLimitNew > baseLimitMax) revert BaseLimitMustBeLessOrEqualToBaseLimitMax();
        if (quoteOffsetNew < quoteOffsetMin) revert QuoteOffsetMustBeGreaterOrEqualToQuoteOffsetMin();
        if (quoteOffsetNew > quoteOffsetMax) revert QuoteOffsetMustBeLessOrEqualToQuoteOffsetMax();
        if (quoteOffsetNew <= baseLimitNew) revert QuoteOffsetMustBeGreaterThanBaseLimit();
        // the following comparison may return true due to integer division (e.g. 10 / 3 * 3 != 10)
        if (quoteOffsetNew / baseLimitNew * baseLimitNew != quoteOffsetNew) revert QuoteOffsetMustBeDivisibleByBaseLimit();
        baseLimit = baseLimitNew;
        quoteOffset = quoteOffsetNew;
    }

    function setOperatorInternal(address payable operatorNew) internal {
        if (operatorNew == address(0)) revert OperatorMustNotBeZeroAddress();
        if (operatorNew == address(this)) revert OperatorMustNotBeContractAddress();
        operator = operatorNew;
    }

    // using a single function for all three taxes to ensure their sum < scaleOfShares (revert otherwise)
    function setTaxesInternal(uint royaltiesNew, uint earningsNew, uint feesNew) internal {
        // checking each value separately first to ensure the sum doesn't overflow (otherwise Echidna reports an overflow)
        if (royaltiesNew >= scaleOfShares || earningsNew >= scaleOfShares || feesNew >= scaleOfShares || royaltiesNew + earningsNew + feesNew >= scaleOfShares) revert RoyaltiesPlusEarningsPlusFeesMustBeLessThanScaleOfShares();
        if (totalSupply() != 0 && (royaltiesNew > royalties || earningsNew > earnings || feesNew > fees)) revert NewTaxesMustBeLessThanOrEqualToOldTaxesOrTotalSupplyMustBeZero();
        royalties = royaltiesNew;
        earnings = earningsNew;
        fees = feesNew;
    }

    /**
     * Distributes profit between beneficiaries and holders
     * Beneficiaries receive shares of profit
     * Holders receive shares of profit remaining after beneficiaries
     *
     * Notes:
     * - May increase tallies[msg.sender] (this is correct because in the limit case where msg.sender is the only holder he must receive the earnings from his own sale)
     */
    function distribute(uint quoteDelta) internal returns (uint quoteDistributed) {
        // common loop variables
        uint i;
        uint length;
        uint total;
        address recipient;

        // distribute to beneficiaries
        uint quoteDistributedToBeneficiaries = (quoteDelta * royalties) / scaleOfShares;
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
        uint quoteDistributedToHolders = (quoteDelta * earnings) / scaleOfShares;
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

        uint quoteDistributedToOperator = (quoteDelta * fees) / scaleOfShares;
        if (quoteDistributedToOperator != 0) {
            operator.transfer(quoteDistributedToOperator);
            quoteDistributed += quoteDistributedToOperator;
        }
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert OnlyOperator();
        _;
    }

    /**
     * The code is intentionally equal to onlyOperator()
     */
    modifier onlyKeeper() override {
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

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (to == address(this)) revert ToAddressMustBeNotEqualToThisContractAddress();
        super._transfer(from, to, amount);
    }

    function _beforeTokenTransfer(
        address,
        address to,
        uint256
    ) internal virtual override {
        // [not needed because it's empty] super._beforeTokenTransfer(from, to, amount);
        // check that address is payable before transferring the tokens, otherwise distribute() will revert for everyone
        // source: https://ethereum.stackexchange.com/a/123679
        // also prevents sending tokens to contacts that don't return true on send()
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
        return precision;
    }
}
