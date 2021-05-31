// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "hardhat/console.sol";

contract BullToken is OwnableUpgradeable, ERC20PausableUpgradeable {
    mapping(address => uint256) public claims;
    address[] public claimers;
    uint256 public maxSupply;
    uint256 public airdropStartTimestamp;
    uint256 public airdropClaimDuration;
    uint256 public airdropStageDuration;

    function initialize(uint256 _airdropStartTimestamp, uint256 _airdropClaimDuration, uint256 _airdropStageDuration) public initializer {
        // https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC20_init_unchained("Bull Token", "BULL");
        __Pausable_init_unchained();
        __ERC20Pausable_init_unchained();

        airdropStartTimestamp = _airdropStartTimestamp;
        airdropClaimDuration = _airdropClaimDuration;
        airdropStageDuration = _airdropStageDuration;

        maxSupply = 10000 * 969_163_000 * 10 ** 18;
    }

    function addClaims(address[] calldata _claimers, uint256[] calldata _amounts) public onlyOwner {
        require(_claimers.length == _amounts.length, "_claimers.length must be equal to _amounts.length");

        for (uint256 i = 0; i < _claimers.length; i++) {
            claims[_claimers[i]] = _amounts[i] * 10 ** 18;
            claimers.push(_claimers[i]);
        }
    }

    function clearClaims() public onlyOwner {
        for (uint256 i = 0; i < claimers.length; i++) {
            delete claims[claimers[i]];
        }
        delete claimers;
    }

    function setClaims(address[] calldata _claimers, uint256[] calldata _amounts) external onlyOwner {
        clearClaims();
        addClaims(_claimers, _amounts);
    }

    function getClaimers() external view returns (address[] memory) {
        return claimers;
    }

    function claim() external {
        require(block.timestamp >= airdropStartTimestamp, "Can't claim before the airdrop is started");
//        uint256 a = block.timestamp - airdropStartTimestamp;
//        uint256 b = (block.timestamp - airdropStartTimestamp) % airdropStageDuration;
        require((block.timestamp - airdropStartTimestamp) % airdropStageDuration < airdropClaimDuration, "Can't claim when not in distribution period");
        require(claims[msg.sender] > 0, "Can't claim because this address has already claimed or didn't hold $SHLD at the snapshot time");
        uint256 amount = claims[msg.sender];
        claims[msg.sender] = 0;
        // delete claimers not necessary?
        _mint(msg.sender, amount);
    }

    function transferMany(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        uint256 amountsLength = amounts.length;
        uint256 recipientsLength = recipients.length;

        require(recipientsLength == amountsLength, "Wrong array length");

        uint256 total = 0;
        for (uint256 i = 0; i < amountsLength; i++) {
            total = total + amounts[i];
        }

        require(balanceOf(msg.sender) >= total, "ERC20: transfer amount exceeds balance");

        for (uint256 i = 0; i < recipientsLength; i++) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];
            require(recipient != address(0), "ERC20: transfer to the zero address");

            super._transfer(msg.sender, recipient, amount);
        }
    }

    function _mint(address account, uint256 amount) internal virtual override {
        super._mint(account, amount);
        require(totalSupply() <= maxSupply, "Can't mint more than maxSupply");
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        super._transfer(sender, recipient, amount * 999 / 1000);
    }

    function withdraw(uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success,) = _msgSender().call{value : amount}("");
        require(success, "Unable to send value");
    }

    function withdrawToken(address token, uint256 amount) public onlyOwner {
        IERC20Upgradeable(token).transfer(msg.sender, amount);
    }

    function pause(bool status) public onlyOwner {
        if (status) {
            _pause();
        } else {
            _unpause();
        }
    }
}
