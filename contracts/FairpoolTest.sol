// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Fairpool.sol";

/* TODO: --test-mode assertion --seed 3466907553603880263
*/
/*
│ TODO: --test-mode overflow --seed 3294998501285897644
│ Integer (over/under)flow: FAILED! with ErrorRevert                                                                   │
│                                                                                                                      │
│ Call sequence:                                                                                                       │
│ 1.setSpeed(4294967295) from: 0x0000000000000000000000000000000000030000 Time delay: 169281 seconds Block delay: 51557│
│ 2.buy(18,70498596129558980856847677460021898912368469118506168097028419144777862940007) from:                        │
│   0x0000000000000000000000000000000000020000 Value: 0x359489c4b7a167a5e Time delay: 153828 seconds Block delay: 27003│
│ 3.buy(129,48960133416982871742625518275409271474683322333502861601241557718971983986245) from:                       │
│   0x0000000000000000000000000000000000030000 Value: 0x2a13dd25d58a069a0 Time delay: 568143 seconds Block delay: 30356│
│ 4.sell(4370000,861,106898650146826997297215973232919858941251249440058062282325167646083766056448) from:             │
│   0x0000000000000000000000000000000000020000 Time delay: 121721 seconds Block delay: 55171                           │
│ 5.sell(3,256,115792089237316195423570985008687907853269984665640564039457584007913129639872) from:                   │
│   0x0000000000000000000000000000000000020000 Time delay: 522754 seconds Block delay: 28794                           │
│ 6.withdraw() from: 0x0000000000000000000000000000000000030000 Time delay: 496136 seconds Block delay: 24202          │
│ 7.sell(129,52660484778663237780071464565046464027335319104838342690756952841235523724912,3593383952245016943846138069│
│   4780992300196015400380485362786373655260182019695) from: 0x0000000000000000000000000000000000030000 Time delay:    │
│   154587 seconds Block delay: 17499                                                                                  │
│ Event sequence:                                                                                                      │
│ Panic(17)
*/
/* TODO: --test-mode overflow --seed 3294998501285897644
setSpeed(19) from: 0x0000000000000000000000000000000000030000 Time delay: 2 seconds Block delay: 38042
buy(4,115792089237316195423570985008687907853269984665640564039457584007913129639933) from: 0x0000000000000000000000000000000000020000 Value: 0x22f7c98084dc04076 Time delay: 528768 seconds Block delay: 44229
sell(1524785993,4294967295,66786300430644570578595084065872006796129629047069570290960947371080795050464) from: 0x0000000000000000000000000000000000020000 Time delay: 581798 seconds Block delay: 11494
buy(127,105152830585912155336727954752533016332958870526817398315241589243067856374907) from: 0x0000000000000000000000000000000000030000 Value: 0x4b1161f2271b908d2 Time delay: 46228 seconds Block delay: 60075
withdraw() from: 0x0000000000000000000000000000000000020000 Time delay: 506764 seconds Block delay: 56073
sell(376,115792089237316195423570985008687907853269984665640564039457584007913129639934,115792089237316195423570985008687907853269984665640564039439137263839420088320) from: 0x0000000000000000000000000000000000030000
*/
/*
 * If the sender sells his full amount, he is no longer included in holders, so sumOfTallies will be incorrect
 * quoteBalanceOfContractIsCorrect() must fail
*/
contract FairpoolTest is Fairpool, Util {
    address payable[] $beneficiaries;
    uint[] $shares;
    uint constant $speed = maxSpeed;
    uint constant $royalties = scale / 2 - 1;
    uint constant $dividends = scale / 2 - 1;

    constructor() Fairpool("FairpoolTest", "FTS", $speed, $royalties, $dividends, $beneficiaries, $shares) {
        // speed and tax can be changed via reset()
        // beneficiaries and shares can be changed via transferShares()
    }

    // msg.value is bounded by native currency supply
    function test() public {
        speedIsBounded();
        taxIsBounded();
        allHoldersHaveTallies();
        quoteBalanceOfContractIsCorrect();
    }

    // allow testing different combinations of speed, royalties, dividends
    function reset(uint speed_, uint royalties_, uint dividends_) public onlyOwner {
        for (uint i = 0; i < holders.length; i++) {
            _burn(holders[i], balanceOf(holders[i]));
            delete tallies[holders[i]];
        }
        payable(owner()).transfer(address(this).balance);
        setSpeedInternal(speed_);
        setRoyaltiesInternal(royalties_);
        setDividendsInternal(dividends_);
    }

    // Using a struct to avoid the "stack too deep" error
    struct Vars {
        uint balanceOfContract;
        uint balanceOfContractCalculated;
        uint baseBalanceOfSender;
        uint quoteBalanceOfSender;
        uint tallyOfSender;
        uint sumOfBalances;
        uint sumOfTallies;
        address[] holders;
    }

    function buy(uint baseReceivedMin, uint deadline) public virtual override payable {
        // hardcode the parameters to minimize reverts
        //        baseReceiveMin = 0;
        //        deadline = type(uint).max;
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance - msg.value;
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTallies = sum(holders, tallies);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.buy(baseReceivedMin, deadline);

        next.balanceOfContract = address(this).balance;
        next.baseBalanceOfSender = balanceOf(sender);
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTallies = sum(holders, tallies);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureGreaterEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureGreaterEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");

        uint diffBalanceOfContract = next.balanceOfContract - prev.balanceOfContract;
        uint diffBaseBalanceOfSender = next.baseBalanceOfSender - prev.baseBalanceOfSender;

        ensureGreaterEqual(diffBaseBalanceOfSender, baseReceivedMin, "diffBaseBalanceOfSender", "baseReceiveMin");
        if (next.balanceOfContract == prev.balanceOfContract) { // the buy transaction was refunded (amount too small)
            ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
            ensureEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
            ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureEqual(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTallies", "prev.sumOfTallies");
            ensureEqual(next.holders, prev.holders, "next.holders", "prev.holders");
            // [sender may have bought earlier, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
            // [already checked by if, so not checking ensureEqual(diffBalanceOfContract, 0)] ensureEqual(diffBalanceOfContract, 0, "diffBalanceOfContract", "0");
        } else {
            ensureGreater(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
            ensureGreaterEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
            ensureGreater(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureGreaterEqual(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTallies", "prev.sumOfTallies");
            ensureGreaterEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
            ensureIncludes(next.holders, sender, "next.holders", "sender");
            ensureLessEqual(diffBalanceOfContract, msg.value, "diffBalanceOfContract", "msg.value");
        }
        ensureEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual override {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance;
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = address(sender).balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTallies = sum(holders, tallies);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.sell(baseDeltaProposed, quoteReceivedMin, deadline);

        next.balanceOfContract = address(this).balance;
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = address(sender).balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTallies = sum(holders, tallies);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureLessEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureLessEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreaterEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.balanceOfContract - next.balanceOfContract;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;

        ensureGreaterEqual(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureLessEqual(neg_diffBaseBalanceOfSender, baseDeltaProposed, "neg_diffBaseBalanceOfSender", "baseDeltaProposed");
        ensureGreaterEqual(diffQuoteBalanceOfSender, quoteReceivedMin, "diffQuoteBalanceOfSender", "quoteReceivedMin");
        // diffTallyOfSender can be anything: -1 if seller sells his full balance, is not included in the distribution, gets removed from holders, gets deleted from tallies, 0 if seller sells a partial amount and is not included in the distribution, 1+ if seller sells any amount and is included in the distribution
        if (neg_diffBalanceOfContract == 0) { // the sell transaction was refunded (amount too small)
            ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
            ensureEqual(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
            ensureEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
            ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureEqual(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTallies", "prev.sumOfTallies");
            ensureEqual(next.holders, prev.holders, "next.holders", "prev.holders");
            ensureIncludes(next.holders, sender, "next.holders", "sender");
        } else {
            ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
            ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
            ensureLessEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
            ensureLess(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
            ensureLessEqual(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTallies", "prev.sumOfTallies");
            ensureLessEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
            // [sender may have sold the full amount, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
        }
        ensureEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function withdraw() public virtual override {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.balanceOfContract = address(this).balance;
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfTallies = sum(holders, tallies);
        prev.holders = getOld(holders);
        prev.balanceOfContractCalculated = prev.sumOfBalances * prev.sumOfBalances * speed / scale;

        super.withdraw();

        next.balanceOfContract = address(this).balance;
        next.baseBalanceOfSender = balanceOf(sender);
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfTallies = sum(holders, tallies);
        next.holders = getNew(holders);
        next.balanceOfContractCalculated = next.sumOfBalances * next.sumOfBalances * speed / scale;

        ensureLessEqual(next.balanceOfContract, prev.balanceOfContract, "next.balanceOfContract", "prev.balanceOfContract");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.balanceOfContract - next.balanceOfContract;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;
        uint neg_diffTallyOfSender = prev.tallyOfSender - next.tallyOfSender;

        ensureGreater(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureEqual(neg_diffBaseBalanceOfSender, 0, "neg_diffBaseBalanceOfSender", "0");
        ensureGreaterEqual(diffQuoteBalanceOfSender, neg_diffBalanceOfContract, "diffQuoteBalanceOfSender", "neg_diffBalanceOfContract");
        ensureGreaterEqual(neg_diffTallyOfSender, prev.tallyOfSender - defaultTally, "diffTallyOfSender", "quoteReceivedMin");
        ensureEqual(next.tallyOfSender, defaultTally, "next.tallyOfSender", "defaultTally");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        ensureLess(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTallies", "prev.sumOfTallies");
        ensureEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureEqual(prev.balanceOfContract, prev.balanceOfContractCalculated, "prev.balanceOfContract", "prev.balanceOfContractCalculated");
        ensureEqual(next.balanceOfContract, next.balanceOfContractCalculated, "next.balanceOfContract", "next.balanceOfContractCalculated");
    }

    function speedIsBounded() internal {
        ensure(speed > 0, "speed > 0");
        ensure(speed <= maxSpeed, "speed <= maxSpeed");
    }

    function taxIsBounded() internal {
        // tax == 0 is ok
        ensure(royalties <= maxRoyalties, "tax <= maxTax");
    }

    function allHoldersHaveTallies() internal {
        for (uint i = 0; i < holders.length; i++) {
            ensureGreater(tallies[holders[i]], 0, string.concat("tallies[holders[", toString(i), "]]"), "0");
        }
        ensureEqual(tallies[address(0)], 0, "tallies[address(0)]", "0");
    }

    function quoteBalanceOfContractIsCorrect() internal {
        uint sumOfTallies = sum(holders, tallies);
        uint sumOfPreallocations = defaultTally * holders.length;
        uint expectedBalance = quoteBalanceOfContract + sumOfTallies - sumOfPreallocations;
        ensureEqual(address(this).balance, expectedBalance, "address(this).balance", "quoteBalanceOfContract + sumOfTallies - sumOfPreallocations");
    }

    // Must be overridden to prevent Echidna from reporting an overflow (there's no explicit revert in ERC20 because it relies on automatic overflow checking)
    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool) {
        address owner = _msgSender();
        uint currentAllowance = allowance(owner, spender);
        unchecked {
            uint newAllowance = currentAllowance + addedValue;
            require(newAllowance >= currentAllowance, "ERC20: increased allowance above type(uint).max");
        }
        return super.increaseAllowance(spender, addedValue);
    }

}
