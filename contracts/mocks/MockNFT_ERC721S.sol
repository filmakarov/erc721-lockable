// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "../ERC721SLockablePermittable.sol";

/// @title MockNFT implementing ERC721S with Permits
/// @author of contract Fil Makarov (@filmakarov)

contract MockNFTERC721S is ERC721SLockablePermittable, Ownable {  

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private constant MAX_ITEMS = 1000;

    string public baseURI;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory myBase) ERC721S("MockNFT S", "MFTS") {
        baseURI = myBase;     
    }

    // for testing purposes. 
    // if you want your collection to start from token #0, you can just remove this override
    // if you want it to start from token #1, change to 'return 1;' instead of 'return 5;'
    function _startTokenIndex() internal pure override returns (uint256) {
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

    /// @notice Iterates over all the exisitng tokens and checks if they belong to the user
    /// This function uses very much resources.
    /// !!! NEVER USE this function with write transactions DIRECTLY. 
    /// Only read from it and then pass data to the write tx
    /// @param tokenOwner user to get tokens of
    /// @return the array of token IDs 
    function tokensOfOwner(address tokenOwner) external view returns(uint256[] memory) {
        uint256 tokenCount = _balanceOf[tokenOwner];
        if (tokenCount == 0) {
            // Return an empty array
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 resultIndex = 0;
            uint256 NFTId;
            for (NFTId = _startTokenIndex(); NFTId < nextTokenIndex; NFTId++) { 
                if (_exists(NFTId)&&(ownerOf(NFTId) == tokenOwner)) {  
                    result[resultIndex] = NFTId;
                    resultIndex++;
                } 
            }     
            return result;
        }
    }

    function unclaimedSupply() public view returns (uint256) {
        return MAX_ITEMS - totalSupply();
    }

    function getTokenTimestamp(uint256 tokenId) public view returns (uint256) {
        return uint256(_packedOwnerships[tokenId] >> 160);
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


