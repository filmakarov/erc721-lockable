// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Strings.sol";

contract MockNFTNonReceiver {  

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    string public baseURI;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory _newBaseUri) {
        baseURI = _newBaseUri;      
    }

    /*///////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////*/

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }
}


