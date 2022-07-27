// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "../ERC721ALockable/ERC721ALockable.sol";

/// @title MockNFT implementing ERC721A with Permits
/// @author of contract Fil Makarov (@filmakarov)

contract MockNFTERC721ALockable is ERC721ALockable, Ownable {  

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private constant MAX_ITEMS = 1000;

    string public baseURI;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory myBase) ERC721A("MockNFT A", "MFT A") {
        baseURI = myBase;     
    }

    // for testing purposes. 
    // if you want your collection to start from token #0, you can just remove this override
    // if you want it to start from token #1, change to 'return 1;' instead of 'return 5;'
    function _startTokenId() internal pure override returns (uint256) {
        return 5;
    }

    /*///////////////////////////////////////////////////////////////
                        MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function mint(address to, uint256 qty) public {
        require(totalSupply() + qty <= MAX_ITEMS, ">MaxSupply");
        _safeMint(to, qty);
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

    function unclaimedSupply() public view returns (uint256) {
        return MAX_ITEMS - totalSupply();
    }
        
    /*///////////////////////////////////////////////////////////////
                       BURN
    //////////////////////////////////////////////////////////////*/

    function burn(uint256 tokenId) public {
        require (msg.sender == ownerOf(tokenId), "Must own to burn");
        _burn(tokenId);
    }

    /*///////////////////////////////////////////////////////////////
                       ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
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


