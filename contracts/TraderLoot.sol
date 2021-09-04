// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "./libraries/Base64.sol";

contract TraderLoot is ERC721Enumerable, ReentrancyGuard, Ownable {

    address parentToken;

    uint256 ownerMaxTokenId;

    uint256 publicMaxTokenId;

    string style;

    string[] private weapons = [
    "Insider",
    "Market Maker",
    "Arbitrageur",
    "Fundamental Analyst",
    "Technical Analyst"
    ];

    string[] private chests = [
    "Uniswap",
    "PancakeSwap",
    "Binance",
    "Bitfinex",
    "Huobi",
    "Kucoin",
    "Coinbase",
    "FTX"
    ];

    string[] private heads = [
    "Spot markets",
    "Perpetual swaps",
    "Futures",
    "Options"
    ];

    string[] private waists = [
    "MACD",
    "RSI",
    "OBV",
    "Stoch RSI",
    "Price action",
    "Bollinger bands",
    "Ichimoku Cloud"
    ];

    string[] private feet = [
    "TradingView",
    "DEXTools",
    "TensorCharts",
    "Dex.guru"
    ];

    string[] private hands = [
    "CoinMarketCap",
    "CoinGecko",
    "Cryptowatch",
    "CryptoCompare",
    "Blockfolio",
    "CryptoPanic"
    ];

    string[] private necks = [
    "Necklace",
    "Amulet",
    "Pendant"
    ];

    string[] private rings = [
    "Gold Ring",
    "Silver Ring",
    "Bronze Ring",
    "Platinum Ring",
    "Titanium Ring"
    ];

    string[] private suffixes = [
    "of Power",
    "of Titans",
    "of Perfection",
    "of Brilliance",
    "of Enlightenment",
    "of Protection",
    "of Anger",
    "of Vitriol",
    "of the Fox",
    "of the Twins"
    ];

    string[] private namePrefixes = [
    "Agony", "Apocalypse", "Armageddon", "Beast", "Behemoth", "Blight", "Blood", "Bramble",
    "Brimstone", "Brood", "Carrion", "Cataclysm", "Chimeric", "Corpse", "Corruption", "Damnation",
    "Death", "Demon", "Dire", "Dragon", "Dread", "Doom", "Dusk", "Eagle", "Empyrean", "Fate", "Foe",
    "Gale", "Ghoul", "Gloom", "Glyph"
    ];

    string[] private nameSuffixes = [
    "Bane",
    "Root",
    "Bite",
    "Song",
    "Roar",
    "Grasp",
    "Instrument",
    "Glow"
    ];

    string[] private rarityPrefixes = [
    "~",
    "+",
    ">"
    ];

    uint256 maxClaimTimestamp;

    function random(string memory input) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }

    function getWeapon(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "WEAPON", weapons);
    }

    function getChest(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "CHEST", chests);
    }

    function getHead(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "HEAD", heads);
    }

    function getWaist(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "WAIST", waists);
    }

    function getFoot(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "FOOT", feet);
    }

    function getHand(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "HAND", hands);
    }

    function getNeck(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "NECK", necks);
    }

    function getRing(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "RING", rings);
    }

    function pluck(uint256 tokenId, string memory keyPrefix, string[] memory sourceArray) internal view returns (string memory) {
        uint256 rand = random(string(abi.encodePacked(name(), keyPrefix, toString(tokenId))));
        string memory output = sourceArray[rand % sourceArray.length];
        uint256 greatness = rand % 21;
        if (greatness > 14) {
            output = string(abi.encodePacked(output, " ", suffixes[rand % suffixes.length]));
        }
        if (greatness >= 19) {
            if (greatness == 19) {
                output = string(abi.encodePacked('"', namePrefixes[rand % namePrefixes.length], ' ', nameSuffixes[rand % nameSuffixes.length], '" ', output));
            } else {
                output = string(abi.encodePacked('"', namePrefixes[rand % namePrefixes.length], ' ', nameSuffixes[rand % nameSuffixes.length], '" ', output, " +1"));
            }
        }
        if (greatness >= 19) {
            return string(abi.encodePacked(rarityPrefixes[2], ' ', output));
        } else if (greatness > 14) {
            return string(abi.encodePacked(rarityPrefixes[1], ' ', output));
        } else {
            return string(abi.encodePacked(rarityPrefixes[0], ' ', output));
        }
    }

    function tokenURI(uint256 tokenId) override public view returns (string memory) {
        string[17] memory parts;

        parts[0] = string(abi.encodePacked('<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>', style, '</style><rect width="100%" height="100%" class="body"/><text x="10" y="20" class="weapon text odd">'));

        parts[1] = getWeapon(tokenId);

        parts[2] = '</text><text x="10" y="40" class="chest text even">';

        parts[3] = getChest(tokenId);

        parts[4] = '</text><text x="10" y="60" class="head text odd">';

        parts[5] = getHead(tokenId);

        parts[6] = '</text><text x="10" y="80" class="waist text even">';

        parts[7] = getWaist(tokenId);

        parts[8] = '</text><text x="10" y="100" class="foot text odd">';

        parts[9] = getFoot(tokenId);

        parts[10] = '</text><text x="10" y="120" class="hand text even">';

        parts[11] = getHand(tokenId);

        parts[12] = '</text><text x="10" y="140" class="neck text odd">';

        parts[13] = getNeck(tokenId);

        parts[14] = '</text><text x="10" y="160" class="ring text even">';

        parts[15] = getRing(tokenId);

        parts[16] = '</text></svg>';

        string memory output = string(abi.encodePacked(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8]));
        output = string(abi.encodePacked(output, parts[9], parts[10], parts[11], parts[12], parts[13], parts[14], parts[15], parts[16]));

        string memory json = Base64.encode(bytes(string(abi.encodePacked('{"name": "Bag #', toString(tokenId), '", "description": "Loot is randomized adventurer gear generated and stored on chain. Stats, images, and other functionality are intentionally omitted for others to interpret. Feel free to use Loot in any way you want.", "image": "data:image/svg+xml;base64,', Base64.encode(bytes(output)), '"}'))));
        output = string(abi.encodePacked('data:application/json;base64,', json));

        return output;
    }

    function claim(uint256 tokenId) public nonReentrant {
        require(tokenId > 0 && tokenId <= publicMaxTokenId, "Token ID invalid");
        require(_msgSender() != owner(), "Owner can't claim");
        require(balanceOf(_msgSender()) == 0, "This address already has a token");
        require(block.timestamp < maxClaimTimestamp, "Can't claim after maxClaimTimestamp");
        require(IERC20(parentToken).balanceOf(_msgSender()) > 0, 'Only parent token owners can claim');
        _safeMint(_msgSender(), tokenId);
    }

    function claimForOwner(uint256 tokenId) public nonReentrant onlyOwner {
        require(tokenId > publicMaxTokenId && tokenId <= ownerMaxTokenId || block.timestamp > maxClaimTimestamp, "Token ID invalid");
        _safeMint(owner(), tokenId);
    }

    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT license
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    constructor(string memory _name, string memory _symbol, address _parentToken, uint256 _publicMaxTokenId, uint256 _ownerMaxTokenId, uint256 _maxClaimTimestamp, string memory _style) ERC721(_name, _symbol) Ownable() {
        require(_ownerMaxTokenId > 0, "ownerMaxTokenId must be greater than 0");
        require(_ownerMaxTokenId >= _publicMaxTokenId, "ownerMaxTokenId must be greater or equal to publicMaxTokenId");
        parentToken = _parentToken;
        publicMaxTokenId = _publicMaxTokenId;
        ownerMaxTokenId = _ownerMaxTokenId;
        maxClaimTimestamp = _maxClaimTimestamp;
        style = _style;
    }
}
