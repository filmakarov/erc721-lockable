// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "erc721a/contracts/ERC721A.sol";
//import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @title Mock Erc721s NFT featuring EIP2612 like logic for gasless listings
/// @author Fil Makarov (@filmakarov)

contract BenchNFTa is Ownable, ERC721A {      

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private immutable MAX_ITEMS = 10000;

    string public baseURI;

    uint256 public itemPrice = 8 * 10**16; // 0.08 eth

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
 
    constructor(string memory myBase) ERC721A("BenchNFTa", "BNFTa") {    
        baseURI = myBase; 
    }

    /*///////////////////////////////////////////////////////////////
                        MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function mint(address to, uint256 qty) public payable {
        // we will check the supply and the amount received to test in the environment, that is close to the real one
        require(totalSupply() + qty <= MAX_ITEMS, ">MaxSupply");
        require(msg.value >= itemPrice*qty, ">MaxSupply");
        _safeMint(to, qty); 
        //_mint(to, qty); 
    }

    /*///////////////////////////////////////////////////////////////
                       PUBLIC METADATA VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the link to the metadata for the token
    /// @param tokenId token ID
    /// @return string with the link
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "NOT_EXISTS");
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    /*///////////////////////////////////////////////////////////////
                       ERC721Receiver interface compatibility
    //////////////////////////////////////////////////////////////*/

    function onERC721Received(
    address, 
    address, 
    uint256, 
    bytes calldata
    ) external pure returns(bytes4) {
        return bytes4(keccak256("I do not receive ERC721"));
    } 

}

//   That's all, folks!


