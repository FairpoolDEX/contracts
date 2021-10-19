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

    // Lord of the Rings
    string[] private heads = [
    "Gandalf",
    "Frodo",
    "Legolas",
    "Arwen",
    "Galadriel",
    "Aragorn",
    "Gollum",
    "Sauron",
    "Bilbo",
    "Gimli",
    "Saruman",
    "Boromir"
    ];

    // Harry Potter
    string[] private torsos = [
    "Darth Vader",
    "Yoda",
    "Obi-Wan Kenobi",
    "Princess Leia",
    "Chewbacca",
    "Jabba the Hutt",
    "Luke Skywalker",
    "Kylo Ren",
    "Boba Fett",
    "Padme Amidala",
    "Darth Maul",
    "Jar Jar Binks",
    "R2-D2",
    "Han Solo",
    "C-3PO"
    ];

    // Game of Thrones
    string[] private arms = [
    "Neo",
    "Morpheus",
    "Trinity",
    "Agent Smith",
    "Tank",
    "Cypher",
    "Dozer"
    ];

    // Star Wars
    string[] private legs = [
    "Harry Potter",
    "Hermione Granger",
    "Albus Dumbledore",
    "Voldemort",
    "Ron Weasley",
    "Dobby",
    "Rubeus Hagrid",
    "Draco Malfoy",
    "Bellatrix Lestrange",
    "Sirius Black"
    ];

    // Marvel
    string[] private nails = [
    "Wolverine",
    "Spider-Man",
    "Thor",
    "Iron Man",
    "Hulk",
    "Captain America",
    "Tarzan",
    "Punisher",
    "Deadpool",
    "Silver Surfer",
    "Wonder Woman",
    "Cyclops",
    "Professor X",
    "Doctor Strange"
    ];

    // Matrix
    string[] private teeth = [
    "Eddard Stark",
    "Robert Baratheon",
    "Jaime Lannister",
    "Catelyn Stark",
    "Tyrion Lannister",
    "Cersei Lannister",
    "Daenerys Targaryen",
    "Jorah Mormont",
    "Jon Snow",
    "Robb Stark",
    "Sansa Stark",
    "Arya Stark",
    "Bran Stark"
    ];

    // Pirates of the Carribean
    string[] private hairs = [
    "Captain Jack Sparrow",
    "Elizabeth Swann",
    "Will Turner",
    "Davy Jones",
    "Hector Barbossa",
    "Anamaria",
    "James Norrington",
    "Bill Turner"
    ];

    // Disney
    string[] private weapons = [
    "Snow White",
    "Mickey Mouse",
    "Donald Duck",
    "Minnie Mouse",
    "Cinderella",
    "Peter Pan",
    "Ariel"
    ];

    string[] private characters = [
    "Gandalf",
    "Frodo",
    "Legolas",
    "Arwen",
    "Galadriel",
    "Aragorn",
    "Gollum",
    "Sauron",
    "Bilbo",
    "Gimli",
    "Saruman",
    "Boromir",

    // Harry Potter
    "Darth Vader",
    "Yoda",
    "Obi-Wan Kenobi",
    "Princess Leia",
    "Chewbacca",
    "Jabba the Hutt",
    "Luke Skywalker",
    "Kylo Ren",
    "Boba Fett",
    "Padme Amidala",
    "Darth Maul",
    "Jar Jar Binks",
    "R2-D2",
    "Han Solo",
    "C-3PO",

    // Game of Thrones
    "Neo",
    "Morpheus",
    "Trinity",
    "Agent Smith",
    "Tank",
    "Cypher",
    "Dozer",

    // Star Wars
    "Harry Potter",
    "Hermione Granger",
    "Albus Dumbledore",
    "Lord Voldemort",
    "Ron Weasley",
    "Dobby",
    "Rubeus Hagrid",
    "Draco Malfoy",
    "Bellatrix Lestrange",
    "Sirius Black",

    // Marvel
    "Wolverine",
    "Spider-Man",
    "Thor",
    "Iron Man",
    "Hulk",
    "Captain America",
    "Tarzan",
    "Punisher",
    "Deadpool",
    "Silver Surfer",
    "Wonder Woman",
    "Cyclops",
    "Professor X",
    "Doctor Strange",

    // Matrix
    "Eddard Stark",
    "Robert Baratheon",
    "Jaime Lannister",
    "Catelyn Stark",
    "Tyrion Lannister",
    "Cersei Lannister",
    "Daenerys Targaryen",
    "Jorah Mormont",
    "Jon Snow",
    "Robb Stark",
    "Sansa Stark",
    "Arya Stark",
    "Bran Stark",

    // Pirates of the Carribean
    "Captain Jack Sparrow",
    "Elizabeth Swann",
    "Will Turner",
    "Davy Jones",
    "Hector Barbossa",
    "Anamaria",
    "James Norrington",
    "Bill Turner",

    // Disney
    "Snow White",
    "Mickey Mouse",
    "Donald Duck",
    "Minnie Mouse",
    "Cinderella",
    "Peter Pan",
    "Ariel"
    ];

    string[] private limbs = [
    "Head",
    "Torso",
    "Left Leg",
    "Right Leg",
    "Left Arm",
    "Right Arm",
    "Ears",
    "Fingers",
    "Toes",
    "Teeth",
    "Nails",
    "Eyes",
    "Hair",
    "Abdomen",
    "Groin"
    ];

    mapping(string => string) private lich_characters;

    //    string[] private weapons = [
    //    "Ethereum",
    //    "Polygon",
    //    "Binance Smart Chain",
    //    "Avalanche",
    //    "Fantom",
    //    "Solana"
    //    ];
    //
    //    string[] private chests = [
    //    "Uniswap",
    //    "SushiSwap",
    //    "PancakeSwap",
    //    "QuickSwap",
    //    "Anyswap"
    //    ];
    //
    //    string[] private heads = [
    //    "Binance",
    //    "Bitfinex",
    //    "Huobi",
    //    "Kucoin",
    //    "Coinbase",
    //    "FTX",
    //    "Bithumb",
    //    "Bybit"
    //    ];
    //
    //    string[] private waists = [
    //    "contracts/TraderLoot.sol:500Chainlink",
    //    "Band Protocol",
    //    "Kylin Network",
    //    "NEST Protocol",
    //    "Modefi",
    //    "Ares Protocol",
    //    "Berry Data"
    //    ];
    //
    //    string[] private feet = [
    //    "CoinMarketCap",
    //    "CoinGecko",
    //    "Cryptowatch",
    //    "CryptoCompare",
    //    "Blockfolio",
    //    "CryptoPanic"
    //    ];

    uint256 maxClaimTimestamp;

    function random(string memory input) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }

    function getHead(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Head", heads);
    }

    function getTorso(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Torso", torsos);
    }

    function getArms(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Arms", arms);
    }

    function getLegs(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Legs", legs);
    }

    function getNails(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Nails", nails);
    }

    function getTeeth(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Teeth", teeth);
    }

    function getHair(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Hair", hairs);
    }

    function getWeapon(uint256 tokenId) public view returns (string memory) {
        return pluck(tokenId, "Weapon", heads);
    }

    function pluck(uint256 tokenId, string memory part, string[] memory sourceArray) internal view returns (string memory) {
        uint256 rand = random(string(abi.encodePacked(name(), part, toString(tokenId)))) % characters.length;
        if (tokenId == 666) {
            return string(abi.encodePacked("\u2020 ", lich_characters[part], " ", part));
        } else {
            return string(abi.encodePacked("\u2020 ", characters[rand], " ", part));
        }
    }

    function tokenURI(uint256 tokenId) override public view returns (string memory) {
        uint256 rand = random(string(abi.encodePacked(name(), toString(tokenId))));

        string memory header;
        if (tokenId == 666) {
            header = string(abi.encodePacked('<tspan class="unique">#', uint2str(tokenId), ' Lich King</tspan>'));
        } else if (tokenId % 100 == 1) {
            header = string(abi.encodePacked('<tspan class="super-rare">#', uint2str(tokenId), ' Vampire Lord</tspan>'));
        } else if (tokenId % 10 == 1) {
            header = string(abi.encodePacked('<tspan class="rare">#', uint2str(tokenId), ' Zombie Captain</tspan>'));
        } else {
            header = string(abi.encodePacked('<tspan class="regular">#', uint2str(tokenId), ' Skeleton Fighter</tspan>'));
        }

        string[17] memory parts;

        parts[0] = string(abi.encodePacked('<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>', style, '</style><rect width="100%" height="100%" class="body"/><text x="7" y="30" class="header">', header, '</text><text y="35"><tspan x="7" dy="25" class="head part odd-part">'));

        parts[1] = getHead(tokenId);

        parts[2] = '</tspan><tspan x="7" dy="25" class="torso part even-part">';

        parts[3] = getTorso(tokenId);

        parts[4] = '</tspan><tspan x="7" dy="25" class="arms part odd-part">';

        parts[5] = getArms(tokenId);

        parts[6] = '</tspan><tspan x="7" dy="25" class="legs part even-part">';

        parts[7] = getLegs(tokenId);

        parts[8] = '</tspan><tspan x="7" dy="25" class="nails part odd-part">';

        parts[9] = getNails(tokenId);

        parts[10] = '</tspan><tspan x="7" dy="25" class="teeth part even-part">';

        parts[11] = getTeeth(tokenId);

        parts[12] = '</tspan><tspan x="7" dy="25" class="hair part odd-part">';

        parts[13] = getHair(tokenId);

        parts[14] = '</tspan><tspan x="7" dy="25" class="weapon part even-part">';

        parts[15] = getWeapon(tokenId);

        parts[16] = '</tspan></text></svg>';

        string memory output = string(abi.encodePacked(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8]));
        output = string(abi.encodePacked(output, parts[9], parts[10], parts[11], parts[12], parts[13], parts[14], parts[15], parts[16]));

        string memory json = Base64.encode(bytes(string(abi.encodePacked('{"name": "Bag #', toString(tokenId), '", "description": "Loot is randomized adventurer gear generated and stored on chain. Stats, images, and other functionality are intentionally omitted for others to interpret. Feel free to use Loot in any way you want.", "image": "data:image/svg+xml;base64,', Base64.encode(bytes(output)), '"}'))));
        output = string(abi.encodePacked('data:application/json;base64,', json));

        return output;
    }

    function uint2str(uint256 _i) internal pure returns (string memory str)    {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
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

    function setMaxTokenId(uint _publicMaxTokenId, uint _ownerMaxTokenId) public onlyOwner {
        publicMaxTokenId = _publicMaxTokenId;
        ownerMaxTokenId = _ownerMaxTokenId;
    }

    constructor(string memory _name, string memory _symbol, address _parentToken, uint256 _publicMaxTokenId, uint256 _ownerMaxTokenId, uint256 _maxClaimTimestamp, string memory _style) ERC721(_name, _symbol) Ownable() {
        require(_ownerMaxTokenId > 0, "ownerMaxTokenId must be greater than 0");
        require(_ownerMaxTokenId >= _publicMaxTokenId, "ownerMaxTokenId must be greater or equal to publicMaxTokenId");
        parentToken = _parentToken;
        publicMaxTokenId = _publicMaxTokenId;
        ownerMaxTokenId = _ownerMaxTokenId;
        maxClaimTimestamp = _maxClaimTimestamp;
        style = _style;
        lich_characters["Head"] = "Voldemort";
        lich_characters["Torso"] = "Agent Smith";
        lich_characters["Arms"] = "C-3PO";
        lich_characters["Legs"] = "Deadpool";
        lich_characters["Teeth"] = "Gollum";
        lich_characters["Nails"] = "Wolverine";
        lich_characters["Hair"] = "Hermione Granger";
        lich_characters["Weapon"] = "Lich King";
    }
}
