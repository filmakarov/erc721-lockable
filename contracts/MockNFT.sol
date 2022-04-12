// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ERC721s.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
//import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

/// @title Mock Erc721s NFT featuring EIP2612 like logic for gasless listings
/// @author Fil Makarov (@filmakarov)
contract MockNFT is ERC721s, Ownable {  

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private immutable MAX_ITEMS = 10000;

    string public baseURI;

    address private minter;

    mapping(uint256 => uint256) public lockingNonces;

    /*///////////////////////////////////////////////////////////////
                            EIP-2612-LIKE STORAGE
    //////////////////////////////////////////////////////////////*/
    
    bytes32 public constant LOCK_PERMIT_TYPEHASH =
        keccak256("Permit(address locker,uint256 tokenId,uint256 nonce,uint256 deadline)");
    
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");

    bytes32 public constant PERMIT_ALL_TYPEHASH = 
        keccak256("PermitAll(address signer,address spender,uint256 nonce,uint256 deadline)");
    
    uint256 internal immutable INITIAL_CHAIN_ID;

    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    mapping(uint256 => uint256) public nonces;

    mapping(address => mapping(address => uint256)) public noncesForAll;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory myBase) ERC721s("MockNFT", "MFT") {
        baseURI = myBase; 
        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();      
    }

    /*///////////////////////////////////////////////////////////////
                        MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function mint(address to, uint256 qty) public {
        // require minting authorization here
        require(totalSupply + qty <= MAX_ITEMS, ">MaxSupply");
        _safeMint(to, qty); 
    }

     /*///////////////////////////////////////////////////////////////
                       LOCKING LOGIC
    //////////////////////////////////////////////////////////////*/
        
    function lock(address unlocker, uint256 id) public {
        address tokenOwner = ownerOf(id);
        require(msg.sender == tokenOwner || msg.sender == getApproved[id] || isApprovedForAll[tokenOwner][msg.sender]
        , "NOT_AUTHORIZED");
        require(getLocked[id] == address(0), "ALREADY_LOCKED"); 
        _lock(unlocker, id);
    }

    function unlock(uint256 id) public {
        require(msg.sender == getLocked[id], "NOT_UNLOCKER");
        _unlock(id);
    }

    function permitLock(
        address signer,
        address locker,
        uint256 tokenId,
        uint256 deadline,
        bytes memory sig,
        address unlocker
    ) public virtual {
        require(getLocked[tokenId] == address(0), "ALREADY_LOCKED");
        require(block.timestamp <= deadline, "PERMIT_DEADLINE_EXPIRED");
        
        // Unchecked because the only math done is incrementing
        // the nonce which cannot realistically overflow.
        unchecked {
            bytes32 digest = keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(LOCK_PERMIT_TYPEHASH, locker, tokenId, lockingNonces[tokenId]++, deadline))
                )
            );
            require(SignatureChecker.isValidSignatureNow(signer, digest, sig), "INVALID_SIGNATURE");
        }

        address tokenOwner = ownerOf(tokenId);
        //the signer should be authorized to manage the token
        require(signer == tokenOwner || signer == getApproved[tokenId] || isApprovedForAll[tokenOwner][signer]
        , "INVALID_SIGNER");
        //only locker address can lock
        require(msg.sender == locker, "INVALID_LOCKER");
        _lock(unlocker, tokenId);
    }

    /*///////////////////////////////////////////////////////////////
                            EIP-2612-LIKE LOGIC
    //////////////////////////////////////////////////////////////*/
    
    function permit(
        address signer,
        address spender,
        uint256 tokenId,
        uint256 deadline,
        bytes memory sig
    ) public virtual {
        require(block.timestamp <= deadline, "PERMIT_DEADLINE_EXPIRED");
        
        address ownerOfToken = ownerOf(tokenId);
        
        // Unchecked because the only math done is incrementing
        // the nonce which cannot realistically overflow.
        unchecked {
            bytes32 digest = keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(PERMIT_TYPEHASH, spender, tokenId, nonces[tokenId]++, deadline))
                )
            );

            require(SignatureChecker.isValidSignatureNow(signer, digest, sig), "INVALID_SIGNATURE");

            //signature is good, now should check if signer had rights to approve this token
            require(signer == ownerOfToken || isApprovedForAll[ownerOfToken][signer], "INVALID_SIGNER");
            
        }
        
        getApproved[tokenId] = spender;

        emit Approval(ownerOfToken, spender, tokenId);
    }
    
    // having permit for all can make purchases cheaper for buyers in future, when marketplace can consume only one 
    // permitAll from buyer to all the tokens from given collection, and all next orders won't need to call permit() 
    // for every new token purchase, so buyers won't pay gas for that call
    // this can be more dangerous for seller btw, to approve All of his tokens to the marketplace instead of per token approvals
    function permitAll(
        address signer,
        address operator,
        uint256 deadline,
        bytes memory sig
    ) public virtual {
        require(block.timestamp <= deadline, "PERMIT_DEADLINE_EXPIRED");
        
        // Unchecked because the only math done is incrementing
        // the owner's nonce which cannot realistically overflow.
        unchecked {
            bytes32 digest = keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(PERMIT_ALL_TYPEHASH, signer, operator, noncesForAll[signer][operator]++, deadline))
                )
            );

            require(SignatureChecker.isValidSignatureNow(signer, digest, sig), "INVALID_SIGNATURE");
        }
        
        // no need to check any kind of ownerships because we always approve operator on behalf of signer,
        // not on behalf of any other owner
        // that does not allow current operators to make isApprovedForAll[owner][one_more_operator] = true
        // but current operator can still aprove explicit tokens with permit(), that is enough I guess
        // and better for security
        isApprovedForAll[signer][operator] = true;

        emit ApprovalForAll(signer, operator, true);
    }

    function DOMAIN_SEPARATOR() public view virtual returns (bytes32 domainSeparator) {
        domainSeparator = block.chainid == INITIAL_CHAIN_ID ? INITIAL_DOMAIN_SEPARATOR : computeDomainSeparator();
    }

    function computeDomainSeparator() internal view virtual returns (bytes32 domainSeparator) {
        domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
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

    /// @notice Returns how many tokens exists 
    /// @return 
    /* 
    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }  
    */

    /// @notice Iterates over all the exisitng tokens and checks if they belong to the user
    /// This function uses very much resources.
    /// !!! NEVER USE this function with write transactions DIRECTLY. 
    /// Only read from it and then pass data to the write tx
    /// @param tokenOwner user to get tokens of
    /// @return the array of token IDs 
    function tokensOfOwner(address tokenOwner) external view returns(uint256[] memory) {
        uint256 tokenCount = balanceOf[tokenOwner];
        if (tokenCount == 0) {
            // Return an empty array
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 resultIndex = 0;
            uint256 NFTId;
            for (NFTId = 1; NFTId <= totalSupply; NFTId++) { 
                if (ownerOf(NFTId) == tokenOwner) {  
                    result[resultIndex] = NFTId;
                    resultIndex++;
                } 
            }     
            return result;
        }
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


