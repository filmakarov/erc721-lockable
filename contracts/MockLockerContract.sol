// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Strings.sol";

/// @title Mock Erc721s NFT featuring EIP2612 like logic for gasless listings
/// @author Fil Makarov (@filmakarov)

interface IMockNFT { 
    function permitLock(address signer, address locker, uint256 tokenId, uint256 deadline, bytes memory sig, address unlocker) external;
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) external;
}

contract MockLockerContract {  

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    IMockNFT private mockNFT;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address mockNFTContr) {

        mockNFT = IMockNFT(mockNFTContr);
    }

    /*///////////////////////////////////////////////////////////////
                        LOGIC
    //////////////////////////////////////////////////////////////*/

    function lockAndTransfer(
        address signer,
        address locker,
        uint256 tokenId,
        uint256 deadline,
        bytes memory sig,
        address to
        ) public {
            
            // use the permit
            mockNFT.permitLock(
                signer,
                locker,
                tokenId,
                deadline,
                sig,
                address(this)
            );

            //transferFrom
            mockNFT.safeTransferFrom(signer, to, tokenId, "");

    }

}


