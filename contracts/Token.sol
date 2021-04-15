// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

struct FrozenWallet {
    address wallet;
    uint totalAmount;
    uint monthlyAmount;
    uint initialAmount;
    uint startDay;
    uint afterDays;
    bool scheduled;
    uint monthDelay;
}

struct VestingType {
    uint monthlyRate;
    uint initialRate;
    uint afterDays;
    uint monthDelay;
    bool vesting;
}

contract ShieldToken is OwnableUpgradeable, ERC20PausableUpgradeable {
    mapping (address => FrozenWallet) public frozenWallets;
    VestingType[] public vestingTypes;
    uint256 public releaseTime;

    function initialize(uint256 _releaseTime) public initializer {
        require(_releaseTime > block.timestamp, "Release time should be in future");

        __Ownable_init();
        __ERC20_init("Shield Finance Token", "SHLD");
        __ERC20Pausable_init();

        releaseTime = _releaseTime;

	    // Mint All TotalSupply in the Account OwnerShip
        _mint(owner(), getMaxTotalSupply());

        // Seed - Locked for 1 month, 5% on first release, then equal parts of 12% over total of 9 months
        vestingTypes.push(VestingType(12000000000000000000, 5000000000000000000, 9 * 30 days, 30 days, true));
        // Private - 10% at listing, then equal parts of 18% over total of 6 months
        vestingTypes.push(VestingType(18000000000000000000, 10000000000000000000, 6 * 30 days, 0, true));
        // Public - 0 Days 100 Percent
        vestingTypes.push(VestingType(100000000000000000000, 100000000000000000000, 0, 1, true));

        //TODO
        //Advisors, Partners
        //Team
        //Rewards
        //Development
        //Marketing
        //Liquidity provisioning
        //Liquidity mining
        //General Reserve

        //legacy:
//        vestingTypes.push(VestingType(1660000000000000000, 0, 30 days, 0, true)); // 30 Days 1.66 Percent
//        vestingTypes.push(VestingType(1660000000000000000, 0, 180 days, 0, true)); // 180 Days 1.66 Percent
//        vestingTypes.push(VestingType(4160000000000000000, 0, 360 days, 0, true)); // 360 Days 4.16 Percent
//        vestingTypes.push(VestingType(4160000000000000000, 0, 30 days, 0, true)); // 30 Days 4.16 Percent
//        vestingTypes.push(VestingType(100000000000000000000, 100000000000000000000, 0, 1, true)); // 0 Days 100 Percent
//        vestingTypes.push(VestingType(11110000000000000000, 0, 30 days, 0, true)); // 30 Days 11.11 Percent
//        vestingTypes.push(VestingType(15000000000000000000, 10000000000000000000, 0, 1, true)); // 0 Days 10 initial 15 monthly Percent
//        vestingTypes.push(VestingType(25000000000000000000, 25000000000000000000, 0, 1, true)); // 0 Days 25 initial 25 monthly Percent
    }

    function getMaxTotalSupply() public pure returns (uint256) {
        return 969_163_000 * 10 ** 18;
    }

    function addAllocations(address[] memory addresses, uint[] memory totalAmounts, uint vestingTypeIndex) external payable onlyOwner returns (bool) {
        require(addresses.length == totalAmounts.length, "Address and totalAmounts length must be same");
        require(vestingTypes[vestingTypeIndex].vesting, "Vesting type isn't found");

        VestingType memory vestingType = vestingTypes[vestingTypeIndex];
        uint addressesLength = addresses.length;

        for(uint i = 0; i < addressesLength; i++) {
            address _address = addresses[i];
            uint256 totalAmount = totalAmounts[i];
            uint256 monthlyAmount = totalAmounts[i] * vestingType.monthlyRate / 100000000000000000000;
            uint256 initialAmount = totalAmounts[i] * vestingType.initialRate / 100000000000000000000;
            uint256 afterDay = vestingType.afterDays;
            uint256 monthDelay = vestingType.monthDelay;

            addFrozenWallet(_address, totalAmount, monthlyAmount, initialAmount, afterDay, monthDelay);
        }

        return true;
    }

    function _mint(address account, uint256 amount) internal override {
        uint totalSupply = super.totalSupply();
        require(getMaxTotalSupply() >= (totalSupply + amount), "Max total supply over");

        super._mint(account, amount);
    }

    function addFrozenWallet(address wallet, uint totalAmount, uint monthlyAmount, uint initialAmount, uint afterDays, uint monthDelay) internal {
        if (!frozenWallets[wallet].scheduled) {
            super._transfer(msg.sender, wallet, totalAmount);
        }

        // Create frozen wallets
        FrozenWallet memory frozenWallet = FrozenWallet(
            wallet,
            totalAmount,
            monthlyAmount,
            initialAmount,
            releaseTime + afterDays,
            afterDays,
            true,
            monthDelay
        );

        // Add wallet to frozen wallets
        frozenWallets[wallet] = frozenWallet;
    }

    // function getTimestamp() external view returns (uint256) {
    //     return block.timestamp;
    // }

    function getMonths(uint afterDays, uint monthDelay) public view returns (uint) {
        uint time = releaseTime + afterDays;

        if (block.timestamp < time) {
            return 0;
        }

        uint diff = block.timestamp - time;
        uint months = diff / 30 days + 1 - monthDelay;

        return months;
    }

    function isStarted(uint startDay) public view returns (bool) {
        if (block.timestamp < releaseTime || block.timestamp < startDay) {
            return false;
        }

        return true;
    }

    function getTransferableAmount(address sender) public view returns (uint256) {
        uint months = getMonths(frozenWallets[sender].afterDays, frozenWallets[sender].monthDelay);
        uint256 monthlyTransferableAmount = frozenWallets[sender].monthlyAmount * months;
        uint256 transferableAmount = monthlyTransferableAmount + frozenWallets[sender].initialAmount;

        if (transferableAmount > frozenWallets[sender].totalAmount) {
            return frozenWallets[sender].totalAmount;
        }

        return transferableAmount;
    }


    function transferMany(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        uint amountsLength = amounts.length;
        uint recipientsLength = recipients.length;

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


    function getRestAmount(address sender) public view returns (uint256) {
        uint256 transferableAmount = getTransferableAmount(sender);
        return frozenWallets[sender].totalAmount - transferableAmount;
    }

    // Transfer control
    function canTransfer(address sender, uint256 amount) public view returns (bool) {
        // Control is scheduled wallet
        if (!frozenWallets[sender].scheduled) {
            return true;
        }

        uint256 balance = balanceOf(sender);
        if (balance > frozenWallets[sender].totalAmount && (balance - frozenWallets[sender].totalAmount) >= amount) {
            return true;
        }

        uint256 restAmount = getRestAmount(sender);
        if (!isStarted(frozenWallets[sender].startDay) || (balance - amount) < restAmount) {
            return false;
        }

        return true;
    }

    // @override
    function _beforeTokenTransfer(address sender, address recipient, uint256 amount) internal virtual override {
        require(canTransfer(sender, amount), "Wait for vesting day!");
        super._beforeTokenTransfer(sender, recipient, amount);
    }

    function withdraw(uint amount) public onlyOwner {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = _msgSender().call{ value: amount }("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function pause(bool status) public onlyOwner {
        if (status) {
            _pause();
        } else {
            _unpause();
        }
    }
}
