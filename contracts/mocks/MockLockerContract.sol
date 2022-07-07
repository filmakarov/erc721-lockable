// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/// @title Mock Locker Contract
/// Demonstrates typical NFT locking flows for services contracts
/// @author Fil Makarov (@filmakarov)

interface IMockNFT { 
    function permit(address signer, address spender, uint256 tokenId, uint256 deadline, bytes memory sig) external;
    function lock(address unlocker, uint256 tokenId) external;
    function unlock(uint256 tokenId) external;

    function transferFrom(address from, address to, uint256 id) external;
    function ownerOf(uint256 tokenId) external returns (address);
}

contract MockLockerContract {  

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    IMockNFT private NFTContract;
    mapping(uint256 => address) prevHolders;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address mockNFTContr) {

        NFTContract = IMockNFT(mockNFTContr);
    }

    /*///////////////////////////////////////////////////////////////
                        LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Typical flow for just locking token
    /// Can be used for non-custodial staking or for NFT-collateralized lendings
    function justLock(
        address signer,
        uint256 tokenId,
        uint256 deadline,
        bytes memory sig
        ) public {
            // do something

            // use the permit to allow this contract to lock token on the holder's wallet
            NFTContract.permit(
                signer,
                address(this),
                tokenId,
                deadline,
                sig
            );

            // lock the token from further transfers
            NFTContract.lock(address(this), tokenId);

            // do something
        }


    /// @notice Typical flow for transfering and locking token
    /// Can be used for example in the rentals service smart contract
    function transferAndLock(
        address signer,
        uint256 tokenId,
        uint256 deadline,
        bytes memory sig,
        address to,
        uint256 deadline2,
        bytes memory sig2
        ) public {

            //do something
            
            // use the permit to allow this contract trasnferring token 
            // from current holder (lender) to the new holder (borrower)
            NFTContract.permit(
                signer,
                address(this),
                tokenId,
                deadline,
                sig
            );

            // use the permit to allow this contract to lock token on the borrower's wallet
            NFTContract.permit(
                to,
                address(this),
                tokenId,
                deadline2,
                sig2
            );

            // We use transferFrom, not the safeTransferFrom to avoid executing any code from ERC721TokenReceiver.onERC721Received
            // between transferring and locking.
            // It is still possible to have undesirable behaviour here, if, for example, NFTContract is the malicious 
            // NFT implementation with modified transferFrom function, but that's the general case, not specific to ERC721S logic
            NFTContract.transferFrom(signer, to, tokenId);
            NFTContract.lock(address(this), tokenId);

            //keep prev holder
            prevHolders[tokenId] = signer;

            //do something
    }

    /// @notice Transfers token back to the original holder
    function unlockAndTransferBack(uint256 tokenId) public {
        //token is automatically unlocked when being transferred
        NFTContract.transferFrom(NFTContract.ownerOf(tokenId), prevHolders[tokenId], tokenId);
    }

}


