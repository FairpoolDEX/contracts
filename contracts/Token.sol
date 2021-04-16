// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

    struct FrozenWallet {
        address wallet;
        uint totalAmount;
        uint monthlyAmount;
        uint initialAmount;
        uint lockDaysPeriod;
        bool scheduled;
    }

    struct VestingType {
        uint monthlyRate;
        uint initialRate;
        uint lockDaysPeriod;
    }

contract ShieldToken is OwnableUpgradeable, ERC20PausableUpgradeable {
    mapping(address => FrozenWallet) public frozenWallets;
    VestingType[] public vestingTypes;
    uint256 public releaseTime;

    function initialize(uint256 _releaseTime) public initializer {
        __Ownable_init();
        __ERC20_init("Shield Finance Token", "SHLD");
        __ERC20Pausable_init();

        setReleaseTime(_releaseTime);

        // Mint All TotalSupply in the Account OwnerShip
        _mint(owner(), getMaxTotalSupply());

        // Seed - Locked for 1 month, 5% on first release, then equal parts of 12% over total of 9 months
        vestingTypes.push(VestingType(12, 5, 30 days));
        // Private - 10% at listing, then equal parts of 18% over total of 6 months
        vestingTypes.push(VestingType(18, 10, 0));
        // Public - 0 Days 100 Percent
        vestingTypes.push(VestingType(100, 100, 0));

        //TODO
        //Advisors, Partners
        //Team
        //Rewards
        //Development
        //Marketing
        //Liquidity provisioning
        //Liquidity mining
        //General Reserve

    }

    function getMaxTotalSupply() public pure returns (uint256) {
        return 969_163_000 * 10 ** 18;
    }

    function addAllocations(address[] memory addresses, uint[] memory totalAmounts, uint vestingTypeIndex) external payable onlyOwner returns (bool) {
        require(addresses.length == totalAmounts.length, "Address and totalAmounts length must be same");
        require(vestingTypeIndex < vestingTypes.length, "Invalid vestingTypeIndex");

        VestingType memory vestingType = vestingTypes[vestingTypeIndex];
        uint addressesLength = addresses.length;

        for (uint i = 0; i < addressesLength; i++) {
            address _address = addresses[i];
            uint256 totalAmount = totalAmounts[i];
            uint256 monthlyAmount = totalAmounts[i] * vestingType.monthlyRate * 10 ** 18 / 100 * 10 ** 18;
            uint256 initialAmount = totalAmounts[i] * vestingType.initialRate * 10 ** 18 / 100 * 10 ** 18;
            uint256 afterDay = vestingType.lockDaysPeriod;

            addFrozenWallet(_address, totalAmount, monthlyAmount, initialAmount, afterDay);
        }

        return true;
    }

    function _mint(address account, uint256 amount) internal override {
        uint totalSupply = super.totalSupply();
        require(getMaxTotalSupply() >= (totalSupply + amount), "Max total supply over");

        super._mint(account, amount);
    }

    function addFrozenWallet(address wallet, uint totalAmount, uint monthlyAmount, uint initialAmount, uint lockDaysPeriod) internal {
        if (!frozenWallets[wallet].scheduled) {
            super._transfer(msg.sender, wallet, totalAmount);
        }

        // Create frozen wallets
        FrozenWallet memory frozenWallet = FrozenWallet(
            wallet,
            totalAmount,
            monthlyAmount,
            initialAmount,
            lockDaysPeriod,
            true
        );

        // Add wallet to frozen wallets
        frozenWallets[wallet] = frozenWallet;
    }

    function getMonths(uint lockDaysPeriod) public view returns (uint) {
        uint unlockTime = releaseTime + lockDaysPeriod;

        if (block.timestamp < unlockTime) {
            return 0;
        }

        uint diff = block.timestamp - unlockTime;
        uint months = diff / 30 days + 1;

        return months;
    }

    function getTransferableAmount(address sender) public view returns (uint256) {
        uint months = getMonths(frozenWallets[sender].lockDaysPeriod);
        uint256 totalMonthlyTransferableAmount = frozenWallets[sender].monthlyAmount * months;
        uint256 transferableAmount = totalMonthlyTransferableAmount + frozenWallets[sender].initialAmount;

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
        // Control only scheduled wallet
        if (!frozenWallets[sender].scheduled) {
            return true;
        }

        uint256 balance = balanceOf(sender);
        if (balance >= frozenWallets[sender].totalAmount && (balance - frozenWallets[sender].totalAmount) >= amount) {
            return true;
        }

        uint256 restAmount = getRestAmount(sender);

        if (block.timestamp < releaseTime || (balance - amount) < restAmount) {
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
        (bool success,) = _msgSender().call{value : amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function pause(bool status) public onlyOwner {
        if (status) {
            _pause();
        } else {
            _unpause();
        }
    }

    function setReleaseTime(uint256 _releaseTime) public onlyOwner {
        if (releaseTime > 0) {
            require(releaseTime > block.timestamp, "Can't change release time after release");
        }
        require(_releaseTime > block.timestamp, "Release time should be in future");
        releaseTime = _releaseTime;
    }
}
