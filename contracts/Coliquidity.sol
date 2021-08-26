// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "hardhat/console.sol";

// TODO: check against https://swcregistry.io/
// TODO: Use automatic ETH <-> WETH conversion from uniswap-v2-periphery
// TODO: Optimize contract storage by removing filled offers, withdrawn offers, withdrawn positions? (- indexes might change)
contract Coliquidity is Ownable {
    // NOTE: Contract functions use Uniswap-style error codes (shorthands like "WEXP", "RAMP"). The error codes should be converted to human-readable error messages in UI.
    // NOTE: Contract functions protect against reentrancy by setting protection status before calling external contracts

    struct Offer {
        address maker;
        address makerToken;
        uint makerAmount;
        address taker; // address of a taker that could create a position from this offer (if zero address - anybody can create)
        address[] takerTokens; // addresses of tokens at the other side of the pool (allows to offer coliquidity for multiple token pairs)
        uint lockedUntil; // UNIX timestamp
    }

    struct Position {
        address maker;
        address taker;
        address makerToken; // SHLD, BULL, LINK, ...
        address takerToken; // USDT, WETH, WBTC, ...
        uint makerAmount; // needed to calculate the fee
        uint takerAmount; // needed to calculate the fee
        uint liquidityAmount;
        uint lockedUntil; // UNIX timestamp
    }

    Offer[] public offers;
    Position[] public positions;

    uint public feeNumerator = 1;
    uint public feeDenominator = 100;

    // UniswapV2Router02: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    address public immutable router;
    // WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    address public immutable WETH;

    event CreateOffer(address indexed sender, uint offerIndex);
    event CreatePosition(address indexed sender, uint positionIndex);
    event WithdrawOffer(address indexed sender, uint offerIndex);
    event WithdrawPosition(address indexed sender, uint positionIndex);

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'Coliquidity: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor(address _router, address _WETH) {
        router = _router;
        WETH = _WETH;
    }

    // only accept ETH via fallback from the WETH contract
    receive() external payable {
        assert(msg.sender == WETH);
    }

    function setFee(uint _feeNumerator, uint _feeDenominator) public onlyOwner {
        require(_feeNumerator > 0, "Coliquidity: SFNZ");
        require(_feeDenominator > 0, "Coliquidity: SFDZ");
        feeNumerator = _feeNumerator;
        feeDenominator = _feeDenominator;
    }

    function createOffer(address makerToken, uint makerAmount, address taker, address[] calldata takerTokens, uint lockedUntil) lock public {
        require(makerToken != address(0), "Coliquidity: COTNZ");
        require(makerAmount > 0, "Coliquidity: COAGZ");
        require(takerTokens.length > 0, "Coliquidity: COPLG");
        require(lockedUntil == 0 || lockedUntil > block.timestamp, "Coliquidity: COLBT");
        // allow taker address to be zero (anybody can take the offer)
        take(makerToken, makerAmount);
        offers.push(
            Offer({maker : msg.sender, makerToken : makerToken, makerAmount : makerAmount, taker : taker, takerTokens : takerTokens, lockedUntil : lockedUntil})
        );
        emit CreateOffer(msg.sender, offers.length - 1);
    }

    function createPosition(uint offerIndex, address takerToken, uint makerAmountDesired, uint takerAmountDesired, uint makerAmountMin, uint takerAmountMin, uint deadline) lock public {
        Offer storage offer = offers[offerIndex];
        // NOTE: _pairingToken is validated within addLiquidity call by UniswapV2Library
        // NOTE: _*Amount* are validated within addLiquidity call by UniswapV2Library
        // NOTE: _deadline is validated within addLiquidity call by ensure modifier
        require(offer.makerAmount >= makerAmountDesired, "Coliquidity: CPAGD");
        require(offer.taker == address(0) || offer.taker == msg.sender, "Coliquidity: CPAGD");
        take(takerToken, takerAmountDesired);
        IERC20(offer.makerToken).approve(router, makerAmountDesired);
        IERC20(takerToken).approve(router, takerAmountDesired);
        (uint makerAmountDeposited, uint takerAmountDeposited, uint liquidityAmountReceived) = IUniswapV2Router02(router).addLiquidity(
            offer.makerToken,
            takerToken,
            makerAmountDesired,
            takerAmountDesired,
            makerAmountMin,
            takerAmountMin,
            address(this),
            deadline
        );
        offer.makerAmount -= makerAmountDeposited;
        give(takerToken, takerAmountDesired - takerAmountDeposited);
        positions.push(
            Position({maker : offer.maker, taker : msg.sender, makerToken : offer.makerToken, takerToken : takerToken, makerAmount : makerAmountDeposited, takerAmount : takerAmountDeposited, liquidityAmount : liquidityAmountReceived, lockedUntil : offer.lockedUntil})
        );
        emit CreatePosition(msg.sender, positions.length - 1);
    }

    function withdrawOffer(uint offerIndex) lock public {
        Offer storage offer = offers[offerIndex];
        require(offer.maker == msg.sender, "Coliquidity: WOMES");
        give(offer.makerToken, offer.makerAmount);
        emit WithdrawOffer(msg.sender, offerIndex);
    }

    function withdrawPosition(uint positionIndex, uint liquidityAmount, uint makerAmountMin, uint takerAmountMin, uint deadline) lock public {
        Position storage position = positions[positionIndex];
        require(position.maker == msg.sender || position.taker == msg.sender, "Coliquidity: WPMTS");
        require(position.lockedUntil <= block.timestamp, "Coliquidity: WPLLT");
        // liquidity is validated within removeLiquidity call
        // makerAmountMin is validated within removeLiquidity call
        // takerAmountMin is validated within removeLiquidity call
        // deadline is validated within removeLiquidity call
        position.liquidityAmount -= liquidityAmount;
        (uint makerAmountWithdrawn, uint takerAmountWithdrawn) = IUniswapV2Router02(router).removeLiquidity(
            position.makerToken,
            position.takerToken,
            liquidityAmount,
            makerAmountMin,
            takerAmountMin,
            address(this),
            deadline
        );
        if (makerAmountWithdrawn > position.makerAmount) {
            uint makerFee = (makerAmountWithdrawn - position.makerAmount) * feeNumerator / feeDenominator;
            position.makerAmount = 0;
            give(position.makerToken, makerAmountWithdrawn - makerFee);
            give(owner(), makerFee);
        } else {
            position.makerAmount -= makerAmountWithdrawn;
            give(position.makerToken, makerAmountWithdrawn);
        }
        if (takerAmountWithdrawn > position.takerAmount) {
            uint takerFee = (takerAmountWithdrawn - position.takerAmount) * feeNumerator / feeDenominator;
            position.takerAmount = 0;
            give(position.takerToken, takerAmountWithdrawn - takerFee);
            give(owner(), takerFee);
        } else {
            position.takerAmount -= takerAmountWithdrawn;
            give(position.takerToken, takerAmountWithdrawn);
        }
        emit WithdrawPosition(msg.sender, positionIndex);
    }

    /* Utility functions */

    function give(address token, uint amount) internal {
        TransferHelper.safeTransfer(token, msg.sender, amount);
    }

    function take(address token, uint amount) internal {
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), amount);
    }

    /* Views */

    function offersLength() public view returns (uint) {
        return offers.length;
    }

    function positionsLength() public view returns (uint) {
        return positions.length;
    }

}
