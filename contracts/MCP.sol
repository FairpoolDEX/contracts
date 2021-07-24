// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

/* mythx-disable SWC-103 */
/* mythx-disable SWC-116 */

contract MCP is Ownable {
    // NOTE: This contract uses Uniswap-style error codes (shorthands like "WEXP", "RAMP"). The error codes should be converted to human-readable error messages in UI.

    // NOTE: Created status is needed because enum vars are initialized to their first element; we don't want to initialize status to Bought because we need to check that the struct exists (which is done by checking that status has been set to a non-default value)
    enum Status { Created, Bought, Sold, Used, Cancelled, Withdrawn }

    struct Protection {
        address buyer;
        address seller;
        uint guaranteedAmount;
        uint guaranteedPrice;
        uint expirationDate; // UNIX timestamp
        uint protectionPrice;
        uint placementDate;
        Status status;
    }

    address base; // SHLD, BULL, LINK, ...
    address quote; // USDT, WETH, WBTC, ...
    uint feeNumerator; // in basis points (0.0001, or 1 / 10000)
    uint constant feeDenominator = 10000;
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
        require(_expirationDate >= block.timestamp, "PEXP");
//        protectionsByBuyer[msg.sender].push(protections.length - 1);
        // TODO: Should the user pay in base or quote currency?
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
            placementDate: block.timestamp,
            status: Status.Bought
        }));
        emit Buy(msg.sender, protections.length - 1);
    }

    function sell(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Bought, "SPSB");
        require(protection.seller == msg.sender || protection.seller == address(0), "SPSS");
        require(protection.expirationDate >= block.timestamp);
        protection.seller = msg.sender;
        protection.status = Status.Sold;
        uint coverage = protection.guaranteedAmount * protection.guaranteedPrice;
        uint premium = protection.guaranteedAmount * protection.protectionPrice;
        uint fee = premium * feeNumerator / feeDenominator;
        take(IERC20(quote), coverage - premium);
        move(IERC20(quote), address(this), owner(), fee);
        emit Sell(msg.sender, _protectionIndex);
    }

    function use(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Sold, "UPSS");
        require(protection.buyer == msg.sender, "UPBS");
        require(protection.expirationDate >= block.timestamp);
        protection.status = Status.Used;
        take(IERC20(base), protection.guaranteedAmount);
        give(IERC20(quote), protection.guaranteedAmount * protection.guaranteedPrice);
        emit Use(msg.sender, _protectionIndex);
    }

    function cancel(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Bought, "CPSB");
        require(protection.buyer == msg.sender, "CPBS");
        require(protection.placementDate + 21600 /* 6 hours * 60 minutes * 60 seconds */ > block.timestamp);
        protection.status = Status.Cancelled;
        // no need to require(protection.expirationDate >= block.timestamp) - always allow the user to cancel the protection that was not sold into
        give(IERC20(quote), protection.guaranteedAmount * protection.protectionPrice);
        emit Cancel(msg.sender, _protectionIndex);
    }

    function withdraw(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Sold || protection.status == Status.Used, "WPSU");
        require(protection.seller == msg.sender, "WPSS");
        require(protection.expirationDate < block.timestamp);
        protection.status = Status.Withdrawn;
        if (protection.status == Status.Sold) {
            give(IERC20(quote), protection.guaranteedAmount * protection.guaranteedPrice);
        }
        if (protection.status == Status.Used) {
            give(IERC20(base), protection.guaranteedAmount);
        }
        emit Withdraw(msg.sender, _protectionIndex);
    }

    /* Utility functions */

    function give(IERC20 token, uint amount) internal {
        move(token, address(this), msg.sender, amount);
    }

    function take(IERC20 token, uint amount) internal {
        move(token, msg.sender, address(this), amount);
    }

    function move(IERC20 token, address sender, address recipient, uint amount) internal {
        uint senderBalanceBefore = token.balanceOf(sender);
        uint recipientBalanceBefore = token.balanceOf(recipient);
        require(token.transferFrom(sender, recipient, amount), "MBAL");
        uint senderBalanceAfter = token.balanceOf(sender);
        uint recipientBalanceAfter = token.balanceOf(recipient);
        require(senderBalanceAfter == senderBalanceBefore - amount);
        require(recipientBalanceBefore == recipientBalanceBefore + amount);
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
