// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

/* mythx-disable SWC-103 */
/* mythx-disable SWC-116 */

// TODO: Use safeTransferFrom from uniswap-v2-periphery
// TODO: Use lock modifier from UniswapV2Pair from uniswap-v2-core
// FIXME: check against https://swcregistry.io/
contract MCP is Ownable {
    // NOTE: Contract functions use Uniswap-style error codes (shorthands like "WEXP", "RAMP"). The error codes should be converted to human-readable error messages in UI.
    // NOTE: Contract functions protect against reentrancy by setting protection status before calling external contracts

    // NOTE: Created status is needed because enum vars are initialized to their first element; we don't want to initialize status to Bought because we need to check that the struct exists (which is done by checking that status has been set to a non-default value)
    enum Status { Created, Bought, Sold, Used, Cancelled, Withdrawn }

    struct Protection {
        address base; // SHLD, BULL, LINK, ...
        address quote; // USDT, WETH, WBTC, ...
        address buyer;
        address seller;
        uint guaranteedAmount;
        uint guaranteedPrice;
        uint expirationDate; // UNIX timestamp in seconds
        uint premium;
        uint fee;
        bool payInBase; // true - pay in base, false - pay in quote
        uint creationDate; // UNIX timestamp in seconds
        Status status;
    }

    uint public feeDivisorMin;
    // solhint-disable-next-line const-name-snakecase
    uint public cancellationTimeout = 6 /* hours */ * 60 /* minutes */ * 60 /* seconds */;
    Protection[] public protections;

    event Buy(address indexed sender, uint protectionIndex);
    event Sell(address indexed sender, uint protectionIndex);
    event Use(address indexed sender, uint protectionIndex);
    event Cancel(address indexed sender, uint protectionIndex);
    event Withdraw(address indexed sender, uint protectionIndex);

    constructor(uint _feeDivisorMin) {
        feeDivisorMin = _feeDivisorMin;
    }

    function setFeeDivisorMin(uint _feeDivisorMin) public onlyOwner {
        require(_feeDivisorMin > 0, "MCP: SFSM");
        feeDivisorMin = _feeDivisorMin;
    }

    function setCancellationTimeout(uint _cancellationTimeout) public onlyOwner {
        require(_cancellationTimeout > 0, "MCP: SCTM");
        cancellationTimeout = _cancellationTimeout;
    }

    function buy(address _base, address _quote, address _seller, uint _guaranteedAmount, uint _guaranteedPrice, uint _expirationDate, uint _premium, uint _fee, bool _payInBase) public {
        require(_expirationDate > block.timestamp, "MCP: BEXP");
        require(_premium > feeDivisorMin, "MCP: BPGD");
        require(_fee >= (_premium / feeDivisorMin), "MCP: BFSM");
        assert(_premium > 0); // using assert because it should always be true if _premium > feeDivisorMin
        take(IERC20(_payInBase ? _base : _quote), _premium + _fee);
        protections.push(Protection({
            base: _base,
            quote: _quote,
            buyer: msg.sender,
            seller: _seller,
            guaranteedAmount: _guaranteedAmount,
            guaranteedPrice: _guaranteedPrice,
            expirationDate: _expirationDate,
            premium: _premium,
            fee: _fee,
            payInBase: _payInBase,
            creationDate: block.timestamp,
            status: Status.Bought
        }));
        emit Buy(msg.sender, protections.length - 1);
    }

    function sell(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Bought, "MCP: SPSB");
        require(protection.seller == msg.sender || protection.seller == address(0), "MCP: SPSS");
        require(protection.expirationDate >= block.timestamp, "MCP: SPET");
        protection.seller = msg.sender;
        protection.status = Status.Sold;
        if (protection.payInBase) {
            take(IERC20(protection.quote), protection.guaranteedAmount * protection.guaranteedPrice);
            give(IERC20(protection.base), protection.premium);
            xfer(IERC20(protection.base), owner(), protection.fee);
        } else {
            // optimize paying in quote by subtracting premium from coverage
            take(IERC20(protection.quote), protection.guaranteedAmount * protection.guaranteedPrice - protection.premium);
            xfer(IERC20(protection.quote), owner(), protection.fee);
        }
        emit Sell(msg.sender, _protectionIndex);
    }

    function use(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Sold, "MCP: UPSS");
        require(protection.buyer == msg.sender, "MCP: UPBS");
        require(protection.expirationDate >= block.timestamp, "MCP: UPET");
        protection.status = Status.Used;
        take(IERC20(protection.base), protection.guaranteedAmount);
        give(IERC20(protection.quote), protection.guaranteedAmount * protection.guaranteedPrice);
        emit Use(msg.sender, _protectionIndex);
    }

    function cancel(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Bought, "MCP: CPSB");
        require(protection.buyer == msg.sender, "MCP: CPBS");
        require(protection.creationDate + cancellationTimeout > block.timestamp, "MCP: CPCT");
        protection.status = Status.Cancelled;
        // no need to require(protection.expirationDate >= block.timestamp) - always allow the user to cancel the protection that was not sold into
        give(IERC20(protection.payInBase ? protection.base : protection.quote), protection.premium + protection.fee);
        emit Cancel(msg.sender, _protectionIndex);
    }

    function withdraw(uint _protectionIndex) public {
        Protection storage protection = protections[_protectionIndex];
        require(protection.status == Status.Sold || protection.status == Status.Used, "MCP: WPSU");
        require(protection.seller == msg.sender, "MCP: WPSS");
        if (protection.status == Status.Sold) {
            require(protection.expirationDate < block.timestamp, "MCP: WPET");
            protection.status = Status.Withdrawn;
            give(IERC20(protection.quote), protection.guaranteedAmount * protection.guaranteedPrice);
            emit Withdraw(msg.sender, _protectionIndex);
        } else if (protection.status == Status.Used) {
            // no require(protection.expirationDate < block.timestamp, "MCP: WPET"); - allow to withdraw early if protection has been used
            protection.status = Status.Withdrawn;
            give(IERC20(protection.base), protection.guaranteedAmount);
            emit Withdraw(msg.sender, _protectionIndex);
        } else {
            revert("WPRV");
        }
    }

    /* Utility functions */

    function xfer(IERC20 token, address recipient, uint amount) internal {
        require(token.transfer(recipient, amount), "MCP: XFER");
    }

    function give(IERC20 token, uint amount) internal {
        require(token.transfer(msg.sender, amount), "MCP: GIVE");
    }

    function take(IERC20 token, uint amount) internal {
        move(token, msg.sender, address(this), amount);
    }

    function move(IERC20 token, address sender, address recipient, uint amount) internal {
        uint senderBalanceBefore = token.balanceOf(sender);
        uint recipientBalanceBefore = token.balanceOf(recipient);
        require(token.transferFrom(sender, recipient, amount), "MCP: MCBL");
        uint senderBalanceAfter = token.balanceOf(sender);
        uint recipientBalanceAfter = token.balanceOf(recipient);
        require(senderBalanceAfter == senderBalanceBefore - amount, "MCP: MSBL");
        require(recipientBalanceAfter == recipientBalanceBefore + amount, "MCP: MRBL");
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
        require(address(this).balance >= amount, "MCP: Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success,) = _msgSender().call{value : amount}("");
        require(success, "MCP: Unable to send value");
    }
}
