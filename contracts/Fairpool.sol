// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ERC20Enumerable.sol";
import "./SharedOwnership.sol";
import "./Util.sol";
import "hardhat/console.sol";

/**
 * Prefixes:
 * - base* - token amount
 * - quote* - money amount (native blockchain currency)
 *
 * Definitions:
 * - baseSupply - equal to totalSupply()
 * - quoteSupply - equal to the logical amount of native blockchain currency in the contract
 * - baseSupplyReal - equal to baseSupply
 * - quoteSupplyReal - equal to the actual amount of native blockchain currency in the contract (as seen in the blockchain explorer)
 * - entity - a group of one or more people
 * - holder - an entity that has a non-zero base amount (receives a share of the holdersFee)
 * - referral - an entity that has referred the holder (receives the referralShare of the holdersFee)
 * - beneficiary - an entity that promotes the token (receives a share of the marketersFee)
 * - agent - an entity that has referred the beneficiary who deployed the smart contract (receives the agentShare of developersFee capped by agentRemainder)
 * - frontendDeveloper - an entity that has developed the frontend for the smart contract (receives the frontendDeveloperShare of developersFee)
 * - smartContractDeveloper - an entity that has developed the smart contract itself (receives the smartContractDeveloperShare of developersFee)
 *
 * Notes:
 * - Variables must use uint instead of smaller types (uint actually costs less gas)
 * - Custom errors must be used over string descriptions (it costs less gas)
 * - Custom errors must not include the function arguments (i.e. don't add function arguments as error parameters)
 * - Custom errors should be translated in UI
 * - Custom errors may have names of any length (the resulting selector is always 4 bytes)
 * - Ownable is needed to allow changing the social media URLs (only owner could do this, and the owner can transfer ownership to a multisig for better security)
 * - Ownable is needed to change curve parameters & taxes (otherwise there could be a battle between the marketers)
 * - Owner may call renounceOwnership(), thus setting the owner to zero address
 * - payable(msg.sender).transfer() are potential contract calls (revert on failure)
 * - SharedOwnership can't be a separate ERC-20 contract because we need to set fees[marketers[i]] = defaultTally (for storage slot preallocation)
 */
contract Fairpool is ERC20Enumerable, ReentrancyGuard, Ownable {
    // Scale of shares of parties (amount = total * share / scale)
    // IMPORTANT: must be kept small to minimize the min quoteDelta in sell()
    uint public constant scale = 10 ** 6;

    // Maximum totalSupply(), used in getBuyDeltas() and getSellDeltas()
    uint public baseLimit;

    // Simulated quote supply, used in getBuyDeltas() and getSellDeltas(), calculated as baseLimit * initialPrice, stored instead of initialPrice because get*Deltas() require it
    uint public quoteOffset;

    uint internal constant baseLimitMin = 1000;

    uint internal constant baseLimitMax = type(uint128).max;

    uint internal constant quoteOffsetMin = baseLimitMin * 2;

    uint internal constant quoteOffsetMax = baseLimitMax;

    // Real balance of contract (less than or equal to `address(this).balance - sum(fees) - defaultTally * holders.length`)
    // Needed to allow lazy withdrawals (no need to send transfers to every tax recipient in sell(), so the real balance of the contract is higher than quoteBalanceOfContract)
    // Also needed to protect against breaking the contract logic by sending the quote currency to it directly
    uint public quoteSupply;

    // PRNG seed used for hardening the generator against manipulation (not preventing it completely, but increasing the cost)
    uint private seed;

    // different share distribution paths
    enum SharePath { root, rootReferral, rootDiscount }

    // Percentage of sale distributed to the parties
    // Example usage: shares[party][SharePath]
    uint[][] public shares;

    // Addresses that can change the shares
    // Example usage: controllers[party][SharePath]
    address[][] public controllers;

    // Recipients of fees
    // Example usage: recipients[party]
    address[] public recipients;

    // Gas limits for calling external contracts from `recipients` array
    uint[] public gasLimits;

    // Recipients of referral fees
    // Example usage: referrals[user][party - 1]
    // IMPORTANT: party index is reduced by 1 (referrals[i] must receive shares[i + 1][SharePath.rootReferral])
    mapping(address => address[]) public referrals;

    // Example usage: isRecognizedReferral[referral][party]
    mapping(address => bool[]) public isRecognizedReferral;

    address payable public operator = payable(0x7554140235ad2D1Cc75452D2008336700C598Dc1);

    // Default developersFee
    uint internal constant developerShareDefault = scale * 25 / 1000; // 2.5%

    // Mapping from user addresses to quote asset balances available for withdrawal
    // IMPORTANT: fees are preallocated in _afterTokenTransfer() and addBeneficiary() to reduce the cost of sell() transaction (shift the gas cost of a storage slot allocation to buy(), transfer(), transferShares()) (see preallocate())
    // IMPORTANT: Due to preallocation, sum(fees) may increase without distribute() if someone simply transfers the underlying token to another person
    // IMPORTANT: There's no deallocation: every address that has been a holder or a beneficiary in the past will always have fees[address] >= defaultTally
    // `if (balanceOf(address) == 0) assert(fees[address] >= defaultTally || fees[address] == 0)` // because marketers may receive fees while their balances are zero
    // `if (balanceOf(address) != 0) assert(fees[address] >= defaultTally)` // because of preallocation
    mapping(address => uint) internal fees;

    // Used to preallocate the storage slot
    // NOTE: `fees[recipient] >= preallocation`
    uint internal constant preallocation = 1;

    // Decimals count (set once in the constructor)
    uint8 internal immutable precision;

    // Incremental holder cost is ~11000 gas (with preallocation optimization)
    // Full distribution cost is ~11000 gas * 256 holders = ~2816000 gas
    uint internal constant holdersPerDistributionMax = 256;

    error BlockTimestampMustBeLessThanOrEqualToDeadline();
    error QuoteDeltaMustBeGreaterThanOrEqualTo2xScale();
    error QuoteDeltaMustBeGreaterThanOrEqualToScale();
    error BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(uint baseDelta);
    error QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(uint quoteDelta);
    error BaseDeltaMustBeGreaterThanZero();
    error BaseDeltaProposedMustBeLessThanOrEqualToBalance();
    error NothingToWithdraw();
    error ToAddressMustBeNotEqualToThisContractAddress();
    error AddressNotPayable(address addr);
    error BaseLimitMustBeGreaterOrEqualToBaseLimitMin();
    error BaseLimitMustBeLessOrEqualToBaseLimitMax();
    error QuoteOffsetMustBeGreaterOrEqualToQuoteOffsetMin();
    error QuoteOffsetMustBeLessOrEqualToQuoteOffsetMax();
    error QuoteOffsetMustBeDivisibleByBaseLimit();
    error QuoteOffsetMustBeGreaterThanBaseLimit();
    error PriceParamsCanBeSetOnlyIfTotalSupplyIsZero();
    error SharesLengthMustBeGreaterThanZero();
    error SharesLengthMustBeEqualToRecipientsLength();
    error SharesLengthMustBeEqualToControllersLength();
    error SharesLengthMustBeEqualToGasLimitsLength();
    error SharesByTypeLengthMustBeEqualToSharePathEnumLength();
    error ControllersByTypeLengthMustBeEqualToSharePathEnumLength();
    error PartyMustBeLessThanSharesLength();
    error PathMustBeLessThanSharePathEnumLength();
    error SumOfSharesMustBeLessThanOrEqualToScale();
    error SumOfSharesOfPartyMustBeLessThanOrEqualToScale();
    error ReferralsLengthMustBeEqualToSharesLength();
    error OnlyController();
    error OnlyRecipient();
    error ControllerMustNotBeContractAddress();
    error RecipientMustNotBeZeroAddress();
    error RecipientMustNotBeContractAddress();
    error CallFailed();

    // Allow subscribing to only 1 event by using Trade instead of Buy and Sell
    event Trade(address indexed sender, bool isBuy, uint baseDelta, uint quoteDelta, uint quoteReceived);
    event Withdraw(address indexed sender, uint quoteReceived);
    event SetReferrals(address indexed sender, address[] referralsNew);
    event SetIsRecognizedReferral(address indexed referral, uint indexed party, bool value);
    event SetPriceParams(uint baseLimit, uint quoteOffset);
    event SetShare(uint indexed party, SharePath indexed path, uint value);
    event SetController(uint indexed party, SharePath indexed path, address controller);
    event SetRecipient(uint indexed party, address recipient);
    event SetGasLimit(uint indexed party, uint gasLimit);

    constructor(
        string memory nameNew,
        string memory symbolNew,
        uint baseLimitNew,
        uint quoteOffsetNew,
        uint8 precisionNew,
        uint[][] memory sharesNew,
        address[][] memory controllersNew,
        address[] memory recipientsNew,
        uint[] memory gasLimitsNew
    ) ERC20(nameNew, symbolNew) Ownable() {
        precision = precisionNew;
        setPriceParamsInternal(baseLimitNew, quoteOffsetNew);
        if (sharesNew.length == 0) revert SharesLengthMustBeGreaterThanZero();
        if (sharesNew.length != controllersNew.length) revert SharesLengthMustBeEqualToControllersLength();
        if (sharesNew.length != recipientsNew.length) revert SharesLengthMustBeEqualToRecipientsLength();
        if (sharesNew.length != gasLimitsNew.length) revert SharesLengthMustBeEqualToGasLimitsLength();
        for (uint i = 0; i < sharesNew.length; i++) {
            if (sharesNew[i].length != uint(type(SharePath).max) + 1) revert SharesByTypeLengthMustBeEqualToSharePathEnumLength();
            if (controllersNew[i].length != uint(type(SharePath).max) + 1) revert ControllersByTypeLengthMustBeEqualToSharePathEnumLength();
        }
        shares = sharesNew;
        controllers = controllersNew;
        recipients = recipientsNew;
        gasLimits = gasLimitsNew;
        validateShares();
    }

    function buy(uint baseDeltaMin, uint deadline, address[] calldata referralsNew) public virtual payable nonReentrant {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        (uint baseDelta, uint quoteDelta) = getBuyDeltas(msg.value);
        // `quoteDelta < 2 * scale` is needed because quoteDelta must be divisible by scale in distribute()
        // using `2 * scale` instead of `scale` because sell() calls saleTargetAmount(), which returns a smaller quoteDelta than was initially passed to buy() as msg.value
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        if (quoteDelta < 2 * scale) revert QuoteDeltaMustBeGreaterThanOrEqualTo2xScale();
        if (baseDelta < baseDeltaMin) revert BaseDeltaMustBeGreaterThanOrEqualToBaseDeltaMin(baseDelta);
        emit Trade(msg.sender, true, baseDelta, quoteDelta, 0);
        _mint(msg.sender, baseDelta);
        quoteSupply += quoteDelta;
        setReferralsInternal(referralsNew);
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline, bytes memory data) public virtual nonReentrant returns (uint quoteDistributed) {
        // slither-disable-next-line timestamp
        if (block.timestamp > deadline) revert BlockTimestampMustBeLessThanOrEqualToDeadline();
        if (baseDeltaProposed > balanceOf(msg.sender)) revert BaseDeltaProposedMustBeLessThanOrEqualToBalance();
        (uint baseDelta, uint quoteDelta) = getSellDeltas(baseDeltaProposed);
        if (baseDelta == 0) revert BaseDeltaMustBeGreaterThanZero();
        if (quoteDelta < scale) revert QuoteDeltaMustBeGreaterThanOrEqualToScale();
        quoteSupply -= quoteDelta;
        quoteDistributed = distribute(quoteDelta);
        uint quoteReceived = quoteDelta - quoteDistributed;
        if (quoteReceived < quoteReceivedMin) revert QuoteReceivedMustBeGreaterThanOrEqualToQuoteReceivedMin(quoteReceived);
        _burn(msg.sender, baseDelta); // IMPORTANT: _burn() must be called after distribute() because holders.length must be greater than 0 (a single holder must be able to sell back & receive holdersFee for himself)
        emit Trade(msg.sender, false, baseDelta, quoteDelta, quoteReceived);
        uint quoteWithdrawn = doWithdrawFeesAndEmit();
        (bool success, ) = payable(msg.sender).call{value: quoteReceived + quoteWithdrawn}(data);
        if (!success) revert CallFailed();
    }

    function withdrawFees(bytes memory data) public virtual nonReentrant {
        uint quoteWithdrawn = doWithdrawFeesAndEmit();
        if (quoteWithdrawn == 0) revert NothingToWithdraw(); // it's better to revert because the wallet will show a warning, and the user won't spend the money on a noop transaction
        (bool success, ) = payable(msg.sender).call{value: quoteWithdrawn}(data);
        if (!success) revert CallFailed();
    }

    function doWithdrawFeesAndEmit() internal returns (uint quoteWithdrawn) {
        if (fees[msg.sender] > preallocation) {
            quoteWithdrawn = fees[msg.sender] - preallocation;
            emit Withdraw(msg.sender, quoteWithdrawn);
            fees[msg.sender] = preallocation;
        } else {
            quoteWithdrawn = 0;
        }
    }

    /**
     * Notes:
     * - May increase fees[msg.sender] (this is correct because in the limit case where msg.sender is the only holder he must receive the holdersFee from his own sale)
     */
    function distribute(uint quoteDelta) internal returns (uint quoteDistributed) {
        uint quoteDistributedToHolders = (quoteDelta * shares[0][uint(SharePath.root)]) / scale;
        if (quoteDistributedToHolders != 0) {
            quoteDistributed += distributeToHolders(quoteDistributedToHolders);
        }

        for (uint party = 1; party < shares.length; party++) {
            uint quoteDistributedToParty = (quoteDelta * shares[party][uint(SharePath.root)]) / scale;
            address referral = referrals[msg.sender][party - 1];
            if (referral != address(0)) {
                // process referral fee
                uint quoteDistributedToReferral = (quoteDistributedToParty * shares[party][uint(SharePath.rootReferral)]) / scale;
                quoteDistributedToParty -= quoteDistributedToReferral;
                fees[referral] += quoteDistributedToReferral;
                quoteDistributed += quoteDistributedToReferral;
                // process user discount
                uint quoteDistributedToDiscount = (quoteDistributedToParty * shares[party][uint(SharePath.rootDiscount)]) / scale;
                quoteDistributedToParty -= quoteDistributedToDiscount;
                // the discount is automatically applied by not increasing quoteDistributed
            }
            if (quoteDistributedToParty != 0) {
                // recipients[party] may be a smart contract with custom logic for further distribution
                // if it's a smart contract, it must call withdrawFees() and perform the distribution before any update to the distribution schema (for example: if it's a smart contract that distributes the fees proportionally to the balances of its token, it must call withdrawFees() and perform the distribution in its own _beforeTokenTransfer())
                fees[recipients[party]] += quoteDistributedToParty;
                quoteDistributed += quoteDistributedToParty;
            }
        }
    }

    function distributeToHolders(uint quoteDistributedToHolders) internal returns (uint quoteDistributed) {
        uint i;
        uint offset;
        uint length = holders.length;
        uint fee;
        uint totalSupplyLocal;
        uint holdersMax = length < holdersPerDistributionMax ? length : holdersPerDistributionMax;
        uint baseOffset = getRandom(quoteDistributedToHolders) % holders.length; // 0 <= baseOffset < holders.length
        // It's OK to use a separate loop to calculate totalSupplyLocal because the gas cost is much lower if you access the same storage slot multiple times within transaction
        for (i = 0; i < holdersMax; i++) {
            offset = addmod(baseOffset, i, length); // calculating offset with wrap-around
            totalSupplyLocal += balanceOf(holders[offset]);
        }
        for (i = 0; i < holdersMax; i++) {
            offset = addmod(baseOffset, i, length); // calculating offset with wrap-around
            fee = (quoteDistributedToHolders * balanceOf(holders[offset])) / totalSupplyLocal;
            fees[holders[offset]] += fee; // always 5000 gas, since we preallocate the storage slot in _afterTokenTransfer
            quoteDistributed += fee;
        }
    }

    function getBaseSupply(uint quoteSupplyNew) internal view returns (uint baseSupplyNew) {
        baseSupplyNew = baseLimit * quoteSupply / (quoteOffset + quoteSupply);
        assert(baseSupplyNew < baseLimit); // baseLimit must never be reached
    }

    function getQuoteSupply(uint baseSupplyNew) internal view returns (uint quoteSupplyNew) {
        quoteSupplyNew = quoteOffset * baseSupplyNew / (baseLimit + baseSupplyNew);
        assert(baseSupplyNew < baseLimit); // baseLimit must never be reached
    }

    /**
     * Notes:
     * - This function may return (0, 0). The caller must check for this case & throw an error if this is undesirable.
     * - "baseSupplyOld" is "totalSupply()"
     * - "quoteSupplyOld" is "quoteBalanceOfContract"
     */
    function getBuyDeltas(uint quoteDeltaProposed) internal returns (uint baseDelta, uint quoteDelta) {
        uint quoteSupplyProposed = quoteSupply + quoteDeltaProposed;
        uint baseSupplyNew = getBaseSupply(quoteSupplyProposed);
        uint quoteSupplyNew = getQuoteSupply(baseSupplyNew); // ensure that quoteSupply is always calculated precisely from baseSupply
        assert(quoteSupplyNew <= quoteSupplyProposed); // due to integer division
        baseDelta = baseSupplyNew - totalSupply();
        quoteDelta = quoteSupplyNew - quoteSupply;
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
        quoteDelta = quoteSupply - quoteSupplyProposed;
    }

    // allow the user to change his/her referrals
    function setReferrals(address[] calldata referralsNew) external nonReentrant {
        setReferralsInternal(referralsNew);
        emit SetReferrals(msg.sender, referralsNew);
    }

    function setIsRecognizedReferral(address referral, uint party, bool value) external onlyValidShareParams(party, SharePath.root) onlyOwner nonReentrant {
        isRecognizedReferral[referral][party] = value;
        emit SetIsRecognizedReferral(referral, party, value);
    }

    function setPriceParams(uint baseLimitNew, uint quoteOffsetNew) external onlyOwner nonReentrant {
        if (totalSupply() != 0) revert PriceParamsCanBeSetOnlyIfTotalSupplyIsZero();
        setPriceParamsInternal(baseLimitNew, quoteOffsetNew);
        emit SetPriceParams(baseLimitNew, quoteOffsetNew);
    }

    function setShare(uint party, SharePath path, uint shareNew) external onlyValidShareParams(party, path) onlyController(party, path) nonReentrant {
        shares[party][uint(path)] = shareNew;
        validateShares();
        emit SetShare(party, path, shareNew);
    }

    function setController(uint party, SharePath path, address controllerNew) external onlyValidShareParams(party, path) onlyController(party, path) nonReentrant {
        validateControllerNew(controllerNew);
        controllers[party][uint(path)] = controllerNew;
        emit SetController(party, path, controllerNew);
    }

    function setRecipient(uint party, address recipientNew) external onlyValidShareParams(party, SharePath.root) onlyController(party, SharePath.root) nonReentrant {
        validateRecipientNew(recipientNew);
        recipients[party] = recipientNew;
        emit SetRecipient(party, recipientNew);
    }

    function setGasLimit(uint party, uint gasLimitNew) external onlyValidShareParams(party, SharePath.root) onlyController(party, SharePath.root) nonReentrant {
        gasLimits[party] = gasLimitNew;
        emit SetGasLimit(party, gasLimitNew);
    }

    function validateShares() internal view {
        uint sumOfShares;
        uint sumOfSharesOfParty;
        for (uint party = 0; party < shares.length; party++) {
            // pre-check to ensure the sum doesn't overflow (otherwise Echidna reports an overflow)
            if (shares[party][uint(SharePath.root)] > scale) revert SumOfSharesOfPartyMustBeLessThanOrEqualToScale();
            sumOfShares += shares[party][uint(SharePath.root)];
            sumOfSharesOfParty = 0;
            for (uint path = 1 /* skip sharePath.root */; path < uint(type(SharePath).max); path++) {
                // pre-check to ensure the sum doesn't overflow (otherwise Echidna reports an overflow)
                if (shares[party][path] > scale) revert SumOfSharesOfPartyMustBeLessThanOrEqualToScale();
                sumOfSharesOfParty += shares[party][path];
            }
            if (sumOfSharesOfParty > scale) revert SumOfSharesOfPartyMustBeLessThanOrEqualToScale();
            // if (sumOfSharesOfParty == scale) then the recipient will get zero quote amount
        }
        if (sumOfShares > scale) revert SumOfSharesMustBeLessThanOrEqualToScale();
        // if (sumOfShares == scale) then the seller will get zero quote amount
    }

    function validateControllerNew(address controllerNew) internal view {
        // allow setting controller to zero address (allow to ensure the share value can't be changed)
        if (controllerNew == address(this)) revert ControllerMustNotBeContractAddress();
    }

    function validateRecipientNew(address recipientNew) internal view {
        if (recipientNew == address(0)) revert RecipientMustNotBeZeroAddress();
        if (recipientNew == address(this)) revert RecipientMustNotBeContractAddress();
    }

    function setReferralsInternal(address[] calldata referralsNew) internal {
        if (referralsNew.length != shares.length) revert ReferralsLengthMustBeEqualToSharesLength();
        for (uint i = 0; i < referralsNew.length; i++) {
            if (referralsNew[i] == address(0)) continue;
            if (referrals[msg.sender][i] == address(0) || isRecognizedReferral[referralsNew[i]][i]) {
                referrals[msg.sender][i] = referralsNew[i];
                preallocate(referralsNew[i]);
            }
        }
    }

    function setPriceParamsInternal(uint baseLimitNew, uint quoteOffsetNew) internal {
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

    modifier onlyValidShareParams(uint party, SharePath path) {
        if (party >= shares.length) revert PartyMustBeLessThanSharesLength();
        if (path > type(SharePath).max) revert PathMustBeLessThanSharePathEnumLength();
        _;
    }

    modifier onlyController(uint party, SharePath path) {
        if (msg.sender != controllers[party][uint(path)]) revert OnlyController();
        _;
    }

    modifier onlyRecipient(uint party) {
        if (msg.sender != recipients[party]) revert OnlyRecipient();
        _;
    }

    /* View functions */

    function withdrawableFees(address account) public view returns (uint) {
        return (fees[account] <= preallocation) ? 0 : fees[account] - preallocation;
    }

    /**
     * This PRNG can potentially be exploited.
     * However, it is only used to determine the base offset for the profit distribution.
     * The only people who can benefit from gaming this function are current token holders.
     * Gaming this function requires the manipulator to have a pre-existing balance, and only benefits multiple existing token holders. Therefore, we think that the risk of manipulation is low.
     * Also, the reward received from manipulation depends on the balance of the manipulator - if they have a small amount of tokens, they won't profit much from the attack
     * They could also attempt to make multiple buy transactions (count = `holdersPerDistributionMax`) from different addresses to secure a continuous sequence of addresses in the distribution.
     * However, that could be broken by previous users selling the tokens and triggering a shuffle of `holders` array
     * Additionally, the `getRandom` function takes the `input` argument, which is equal to `quoteDistributedToHolders` at call site, which is calculated from `quoteDelta`, which is set by the user
     * Additionally, the `getRandom` function uses the `seed` variable from contract storage that changes with each transaction, so the manipulator would have to know all previous transactions in the block (= must collaborate with the current validator)
     * The "sandwich manipulation" is also impractical since the manipulator would have to pay fees in the sell transaction of the sandwich (sandwich = a sequence of 3 transactions where 1st transaction is manipulator buy transaction, 2nd transaction is user sell transaction, 3rd transaction is manipulator sell transaction)
     */
    function getRandom(uint input) internal returns (uint) {
        seed = uint(keccak256(abi.encodePacked(seed, block.timestamp, block.difficulty, block.coinbase, blockhash(block.number - 1), msg.sender, input)));
        return seed;
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

    function preallocate(address target) internal {
        // `if` is necessary to prevent overwriting an existing positive tally
        if (fees[target] == 0) fees[target] = preallocation;
    }

    function decimals() public view virtual override returns (uint8) {
        return precision;
    }

    function recoverERC20(IERC20 token, uint256 amount) public onlyOwner {
        token.transfer(msg.sender, amount);
    }

    function recoverERC721(IERC721 token, uint256 tokenId) public onlyOwner {
        token.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    // NOTE: ERC1155 implement only safeTransferFrom, which reverts if the user sends the tokens to a contract that does not implement IERC1155Receiver
}
