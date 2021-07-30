// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

/* mythx-disable SWC-103 */
/* mythx-disable SWC-116 */

// FIXME: check against https://swcregistry.io/
contract MCP is Ownable {
    // NOTE: Contract functions use Uniswap-style error codes (shorthands like "WEXP", "RAMP"). The error codes should be converted to human-readable error messages in UI.
    // NOTE: Contract functions protect against reentrancy by setting protection status before calling external contracts

    // NOTE: Created status is needed because enum vars are initialized to their first element; we don't want to initialize status to Bought because we need to check that the struct exists (which is done by checking that status has been set to a non-default value)
    enum Status { Created, Bought, Sold, Used, Cancelled, Withdrawn }

    struct Protection {
        address buyer;
        address seller;
        uint guaranteedAmount;
        uint guaranteedPrice;
        uint expirationDate; // UNIX timestamp
        uint protectionPrice;
        uint creationDate;
        Status status;
    }

    address public immutable base; // SHLD, BULL, LINK, ...
    address public immutable quote; // USDT, WETH, WBTC, ...
    uint public immutable feeNumerator; // in basis points (feeMultiplier == feeNumerator / feeDenominator)
    // solhint-disable-next-line const-name-snakecase
    uint public constant feeDenominator = 10000;
    uint public constant cancellationTimeout = 6 /* hours */ * 60 /* minutes */ * 60 /* seconds */;
    Protection[] public protections;
//    mapping(address => uint[]) public protectionsByBuyer;
//    mapping(address => uint[]) public protectionsBySeller;

    event Buy(address indexed sender, uint protectionIndex);
    event Sell(address indexed sender, uint protectionIndex);
    event Use(address indexed sender, uint protectionIndex);
    event Cancel(address indexed sender, uint protectionIndex);
    event Withdraw(address indexed sender, uint protectionIndex);

    constructor(address _base, address _quote, uint _feeNumerator) {
        // FIXME: Check that base & quote are ERC20 tokens
        // FIXME: Implement automatic ETH -> WETH conversion like on Uniswap
        base = _base;
        quote = _quote;
        feeNumerator = _feeNumerator;
    }

    function buy(address _seller, uint _guaranteedAmount, uint _guaranteedPrice, uint _expirationDate, uint _protectionPrice) public {
        require(_expirationDate > block.timestamp, "BEXP");
//        protectionsByBuyer[msg.sender].push(protections.length - 1);
        // TODO: Should the user pay in base or quote currency? (add `address feeToken` parameter?)
        uint premium = _guaranteedAmount * _protectionPrice;
        uint fee = premium * feeNumerator / feeDenominator;
        take(IERC20(quote), premium + fee);
        protections.push(Protection({
            buyer: msg.sender,
            seller: _seller,
            guaranteedAmount: _guaranteedAmount,
            guaranteedPrice: _guaranteedPrice,
            expirationDate: _expirationDate,
            protectionPrice: _protectionPrice,
            creationDate: block.timestamp,
            status: Status.Bought
        }));
        emit Buy(msg.sender, protections.length - 1);
    }

    function sell(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Bought, "SPSB");
        require(protection.seller == msg.sender || protection.seller == address(0), "SPSS");
        require(protection.expirationDate >= block.timestamp, "SPET");
        protection.seller = msg.sender;
        protection.status = Status.Sold;
        uint coverage = protection.guaranteedAmount * protection.guaranteedPrice;
        uint premium = protection.guaranteedAmount * protection.protectionPrice;
        uint fee = premium * feeNumerator / feeDenominator;
        take(IERC20(quote), coverage - premium);
        xfer(IERC20(quote), owner(), fee);
        emit Sell(msg.sender, _protectionIndex);
    }

    function use(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Sold, "UPSS");
        require(protection.buyer == msg.sender, "UPBS");
        require(protection.expirationDate >= block.timestamp, "UPET");
        protection.status = Status.Used;
        take(IERC20(base), protection.guaranteedAmount);
        give(IERC20(quote), protection.guaranteedAmount * protection.guaranteedPrice);
        emit Use(msg.sender, _protectionIndex);
    }

    function cancel(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Bought, "CPSB");
        require(protection.buyer == msg.sender, "CPBS");
        require(protection.creationDate + cancellationTimeout > block.timestamp, "CPCT");
        protection.status = Status.Cancelled;
        // no need to require(protection.expirationDate >= block.timestamp) - always allow the user to cancel the protection that was not sold into
        uint premium = protection.guaranteedAmount * protection.protectionPrice;
        uint fee = premium * feeNumerator / feeDenominator;
        give(IERC20(quote), premium + fee);
        emit Cancel(msg.sender, _protectionIndex);
    }

    function withdraw(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Sold || protection.status == Status.Used, "WPSU");
        require(protection.seller == msg.sender, "WPSS");
        if (protection.status == Status.Sold) {
            require(protection.expirationDate < block.timestamp, "WPET");
            protection.status = Status.Withdrawn;
            give(IERC20(quote), protection.guaranteedAmount * protection.guaranteedPrice);
            emit Withdraw(msg.sender, _protectionIndex);
        } else if (protection.status == Status.Used) {
            // no require(protection.expirationDate < block.timestamp, "WPET"); - allow to withdraw early if protection has been used
            protection.status = Status.Withdrawn;
            give(IERC20(base), protection.guaranteedAmount);
            emit Withdraw(msg.sender, _protectionIndex);
        } else {
            revert("WPRV");
        }
    }

    /* Utility functions */

    function xfer(IERC20 token, address recipient, uint amount) internal {
        require(token.transfer(recipient, amount), "XFER");
    }

    function give(IERC20 token, uint amount) internal {
        require(token.transfer(msg.sender, amount), "GIVE");
    }

    function take(IERC20 token, uint amount) internal {
        move(token, msg.sender, address(this), amount);
    }

    function move(IERC20 token, address sender, address recipient, uint amount) internal {
        uint senderBalanceBefore = token.balanceOf(sender);
        uint recipientBalanceBefore = token.balanceOf(recipient);
        require(token.transferFrom(sender, recipient, amount), "MCBL");
        uint senderBalanceAfter = token.balanceOf(sender);
        uint recipientBalanceAfter = token.balanceOf(recipient);
        require(senderBalanceAfter == senderBalanceBefore - amount, "MSBL");
        require(recipientBalanceAfter == recipientBalanceBefore + amount, "MRBL");
    }

    /* Views */

    function protectionsLength() public view returns (uint) {
        return protections.length;
    }

    /* Helpful functions that allow to withdraw token or ether if user sends them to MCP contract by mistake */

    function withdrawToken(address token, uint amount) public onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }

    function withdrawEther(uint amount) public onlyOwner {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success,) = _msgSender().call{value : amount}("");
        require(success, "Unable to send value");
    }
}
