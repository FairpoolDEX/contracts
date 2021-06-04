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

    struct Offer {
        uint amountProvided; // quantity of base asset that was provided to be bought by liquidity provider
        uint amountReserved; // quantity of base asset that was reserved by traders
        uint amountUtilized; // quantity of base asset that was utilized (sold) by traders
        uint guaranteedPrice;
        uint protectionPrice;
        uint expirationDate; // UNIX timestamp
        bool isWithdrawn;
    }

    struct Claim {
        uint amountReserved;
        uint amountUtilized;
        uint offerIndex;
    }

    address public base; // SHLD, BULL, LINK, ...
    address public quote; // USDT, WETH, WBTC, ...
    Offer[] public offers;
    Claim[] public claims;
    mapping(address => uint[]) public offersByAddress;
    mapping(address => uint[]) public claimsByAddress;

    event Provide(address indexed sender, uint amountProvided, uint guaranteedPrice, uint protectionPrice, uint expirationDate);
    event Reserve(address indexed sender, uint amountReserved, uint offerIndex);
    event Utilize(address indexed sender, uint amountUtilized);
    event Withdraw(address indexed sender, uint offerIndex);

    constructor(address _base, address _quote) {
        base = _base;
        quote = _quote;
    }

    function provide(uint _amountProvided, uint _guaranteedPrice, uint _protectionPrice, uint _expirationDate) public {
        require(_expirationDate >= block.timestamp, "PEXP");
        offers.push(Offer({
            amountProvided: _amountProvided,
            amountReserved: 0,
            amountUtilized: 0,
            guaranteedPrice: _guaranteedPrice,
            protectionPrice: _protectionPrice,
            expirationDate: _expirationDate,
            isWithdrawn: false
        }));
        offersByAddress[msg.sender].push(offers.length - 1);
        take(IERC20(quote), _amountProvided * _guaranteedPrice);
        emit Provide(msg.sender, _amountProvided, _guaranteedPrice, _protectionPrice, _expirationDate);
    }

    function reserve(uint _amountReserved, uint _offerIndex) public {
        Offer storage offer = offers[_offerIndex];
        require(offer.expirationDate >= block.timestamp, "REXP");
        offer.amountReserved += _amountReserved;
        require(offer.amountReserved <= offer.amountProvided, "RAMP");
        claims.push(Claim({
            amountReserved: _amountReserved,
            amountUtilized: 0,
            offerIndex: _offerIndex
        }));
        claimsByAddress[msg.sender].push(claims.length - 1);
        uint _totalReserved = _amountReserved * offer.guaranteedPrice;
        uint _premiumReserved = _amountReserved * offer.protectionPrice;
        take(IERC20(quote), _totalReserved + _premiumReserved);
        emit Reserve(msg.sender, _amountReserved, _offerIndex);
    }

    function utilize(uint _amountUtilized) public {
        uint _totalUtilized = 0;
        uint amountToUtilize = _amountUtilized;
        uint amountToUtilizeActual;
        uint[] storage claimIndexes = claimsByAddress[msg.sender];
        for (uint i = 0; i < claimIndexes.length; i++) {
            Claim storage claim = claims[claimIndexes[i]];
            Offer storage offer = offers[claim.offerIndex];
            if (offer.expirationDate < block.timestamp) continue; // allow to utilize those offers that haven't expired yet
            uint amountLeft = claim.amountReserved - claim.amountUtilized;
            amountToUtilizeActual = Math.min(amountToUtilize, amountLeft);
            claim.amountUtilized += amountToUtilizeActual;
            require(claim.amountUtilized <= claim.amountReserved);
            offer.amountUtilized += amountToUtilizeActual;
            require(offer.amountUtilized <= offer.amountReserved);
            amountToUtilize -= amountToUtilizeActual;
            _totalUtilized += amountToUtilizeActual * offer.guaranteedPrice;
            if (amountToUtilize == 0) {
                break;
            }
        }
        require(amountToUtilize == 0, "UATU"); // Can't utilize full amount
        take(IERC20(base), _amountUtilized);
        give(IERC20(quote), _totalUtilized);
        emit Utilize(msg.sender, _amountUtilized);
    }

    function withdraw(uint _offerIndex) public {
        withdrawInternal(_offerIndex);
    }

    function withdrawMany(uint[] calldata _offerIndexes) public {
        for (uint i = 0; i < _offerIndexes.length; i++) {
            withdrawInternal(_offerIndexes[i]);
        }
    }

    function withdrawInternal(uint _offerIndex) internal {
        Offer storage offer = offers[_offerIndex];
        require(block.timestamp >= offer.expirationDate, "WEXP");
        require(!offer.isWithdrawn, "WITH");
        offer.isWithdrawn = true;
        uint amountToWithdraw = offer.amountUtilized;
        uint totalToWithdraw = (offer.amountProvided - offer.amountUtilized) * offer.guaranteedPrice;
        uint premiumToWithdraw = (offer.amountProvided - offer.amountUtilized) * offer.protectionPrice;
        give(IERC20(base), amountToWithdraw);
        give(IERC20(quote), totalToWithdraw + premiumToWithdraw);
        emit Withdraw(msg.sender, _offerIndex);
        /**
         * Delete the offer from contract storage?
         * - And save gas
         * - And stay under contract memory limit
         * - But lose history
         * - But need to maintain claimIndexes (to clear expired claims)
         */
    }

    /* Utility functions */

    // NOTE: `give` and `take` functions will revert the transaction if the `token` burns on transfer (e.g. if `token` is deflationary)

    function give(IERC20 token, uint amount) internal {
        uint balanceBefore = token.balanceOf(msg.sender);
        token.transfer(msg.sender, amount);
        uint balanceAfter = token.balanceOf(msg.sender);
        require(balanceAfter == balanceBefore + amount, "GBAL");
    }

    function take(IERC20 token, uint amount) internal {
        uint balanceBefore = token.balanceOf(address(this));
        token.transfer(address(this), amount);
        uint balanceAfter = token.balanceOf(address(this));
        require(balanceAfter == balanceBefore + amount, "TBAL");
    }

    /* Views */

    function offersLength() public view returns (uint) {
        return offers.length;
    }

    function claimsLength() public view returns (uint) {
        return claims.length;
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
