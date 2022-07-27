// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../ERC721OZLockable/ERC721OZLockablePermittable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title MockNFT implementing ERC721 by OZ with Permits
/// @author of contract Fil Makarov (@filmakarov)

contract MockNFTERC721OZ is ERC721OZLockablePermittable, Ownable {  

using Strings for uint256;
using Counters for Counters.Counter;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private constant MAX_ITEMS = 1000;

    string public baseURI;

    Counters.Counter private _tokenIds;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory myBase) ERC721("MockNFT OZ", "MFTOZ") {
        baseURI = myBase;     
    }

    /*///////////////////////////////////////////////////////////////
                        MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function mint(address to, uint256 qty) public {
        for (uint256 i=0; i<qty; i++) {
            uint256 newItemId = _tokenIds.current();
            _safeMint(to, newItemId);
            _tokenIds.increment(); 
        }
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


