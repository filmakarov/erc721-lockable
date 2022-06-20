// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "../ERC721s.sol";

/// @title Chrysanthemum drop for hypercube.art
/// artist Daniel ()
/// @author of contract Fil Makarov (@filmakarov)

contract MockNFT is ERC721s, Ownable {  

using Strings for uint256;

    /*///////////////////////////////////////////////////////////////
                            GENERAL STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private constant MAX_ITEMS = 1000;

    string public baseURI;

    /*///////////////////////////////////////////////////////////////
                            EIP-2612-LIKE STORAGE
    //////////////////////////////////////////////////////////////*/
    
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");

    uint256 internal immutable INITIAL_CHAIN_ID;

    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    mapping(uint256 => uint256) public nonces;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory myBase) ERC721s("CHRYSANTHEMUM", "CHY") {
        baseURI = myBase; 
        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();      
    }

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
                       LOCKING LOGIC (ERC721S)
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


