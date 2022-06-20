// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title ERC721s
/// @notice Improvement to ERC721 standard, that introduces lockable NFTs. 
/// @notice Based on Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/tokens/ERC721.sol)
/// @author filio.eth (https://twitter.com/filmakarov)

abstract contract ERC721s {
    /*///////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Transfer(address indexed _from, address indexed _to, uint256 indexed _id);

    event Approval(address indexed owner, address indexed spender, uint256 indexed id);

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /*///////////////////////////////////////////////////////////////
                          METADATA STORAGE/LOGIC
    //////////////////////////////////////////////////////////////*/

    string public name;

    string public symbol;

    function tokenURI(uint256 id) public view virtual returns (string memory);

    /*///////////////////////////////////////////////////////////////
                            ERC721 STORAGE                        
    //////////////////////////////////////////////////////////////*/

    uint256 public nextTokenIndex;
    mapping(uint256 => address) public owners;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => bool) public isBurned;
    uint256 public burnedCounter;

    mapping(address => uint256) internal _balanceOf;

    function balanceOf(address owner) public view virtual returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS");

        return _balanceOf[owner];
    }

    /*///////////////////////////////////////////////////////////////
                            ERC721s STORAGE                        
    //////////////////////////////////////////////////////////////*/

    mapping(uint256 => address) public getLocked;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        nextTokenIndex = _startTokenIndex();
    }

    /*///////////////////////////////////////////////////////////////
                              ERC721s LOGIC
    //////////////////////////////////////////////////////////////*/
    
    function _lock(address unlocker, uint256 id) internal virtual {
        getLocked[id] = unlocker;
    }

    function _unlock(uint256 id) internal virtual {
        getLocked[id] = address(0);
    }

    /*///////////////////////////////////////////////////////////////
                              ERC721 LOGIC
    //////////////////////////////////////////////////////////////*/

    function approve(address spender, uint256 id) public virtual {
        address owner = ownerOf(id);

        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "NOT_AUTHORIZED");
        getApproved[id] = spender;
        emit Approval(owner, spender, id);
    }

    function setApprovalForAll(address operator, bool approved) public virtual {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual {
        
        require(from == ownerOf(id), "WRONG_FROM");
        require(to != address(0), "INVALID_RECIPIENT");

        // token should not be locked or msg sender should be unlocker
        require(getLocked[id] == address(0) || msg.sender == getLocked[id], "LOCKED");

        // msg.sender should be authorized to transfer
        // i.e. msg.sender should be owner, approved or unlocker
        require(
            msg.sender == getLocked[id] || msg.sender == from || 
            msg.sender == getApproved[id] || isApprovedForAll[from][msg.sender], 
            "NOT_AUTHORIZED"
        );

        // Underflow of the sender's balance is impossible because we check for
        // ownership above and the recipient's balance can't realistically overflow.
        unchecked {
            _balanceOf[from]--;
            _balanceOf[to]++;
        }

        owners[id] = to;
        uint256 nextId = id+1;

        //to prevent new owner to become the owner of next tokens in the batch 
        if (owners[nextId] == address(0)) {  //if that was not the last token of batch
            if (_exists(nextId)) { //and the next token exists (was minted) and has not been burned
                owners[nextId] = from; //explicitly set the owner for that token
            }
        }

        delete getApproved[id];
        delete getLocked[id];

        emit Transfer(from, to, id);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual {
        transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes calldata data
    ) public virtual {
        transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function _exists(uint256 id) internal view returns (bool) {
        return (id < nextTokenIndex && !isBurned[id] && id >= _startTokenIndex());
    }

    function totalSupply() public view returns (uint256) {
        return totalMinted() - burnedCounter;
    }

    function totalMinted() public view returns (uint256) {
        return nextTokenIndex - _startTokenIndex();
    }

    /*///////////////////////////////////////////////////////////////
                              CUSTOM OwnerOf FOR BATCH MINTING
    //////////////////////////////////////////////////////////////*/

    function ownerOf(uint256 id) public view returns (address) {
        require(_exists(id), "NOT_MINTED_YET_OR_BURNED");

        unchecked {
            for (uint256 curr = id; curr >=0; curr--) {
                if (owners[curr] != address(0)) {
                    return owners[curr];
                }
            }
        }

        revert('ERC721A: unable to determine the owner of token');
    }

    /*///////////////////////////////////////////////////////////////
                              ERC165 LOGIC
    //////////////////////////////////////////////////////////////*/

    function supportsInterface(bytes4 interfaceId) public pure virtual returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165 Interface ID for ERC165
            interfaceId == 0x80ac58cd || // ERC165 Interface ID for ERC721
            interfaceId == 0x5b5e139f; // ERC165 Interface ID for ERC721Metadata
    }

    /*///////////////////////////////////////////////////////////////
                       INTERNAL MINT/BURN LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the starting token ID.
     * To change the starting token ID, please override this function.
     * Inspired by ERC721A
     */
    function _startTokenIndex() internal view virtual returns (uint256) {
        return 0;
    }

    function _mint(address to, uint256 qty) internal virtual {
        require(to != address(0), "INVALID_RECIPIENT");
        require(qty != 0, "CAN_NOT_MINT_0");

        uint256 startTokenIndex = nextTokenIndex;

        // put just the first owner in the batch
        owners[nextTokenIndex]=to;

        // Counter overflow is incredibly unrealistic here.
        unchecked {
                nextTokenIndex += qty;
            }
          
        //balanceOf change thru assembly
        assembly {
            mstore(0, to)
            mstore(32, _balanceOf.slot)
            let hash := keccak256(0, 64)
            sstore(hash, add(sload(hash), qty))
        } 

        for (uint256 i=startTokenIndex; i<nextTokenIndex; i++) {
            emit Transfer(address(0), to, i);
        }
    }

    function _burn(uint256 id) internal virtual {
        address owner = ownerOf(id);
        require(owner != address(0), "NOT_MINTED");

        // Ownership check above ensures no underflow.
        unchecked {
            _balanceOf[owner]--;
        }
        delete owners[id];
        isBurned[id] = true;
        burnedCounter++;

        uint256 nextId = id+1;
        if (owners[nextId] == address(0)) {  //if that was not the last token of batch
            if (_exists(nextId)) { //and the next token exists (was minted) and has not been burned
                owners[nextId] = owner; //explicitly set the owner for that token
            }
        }

        delete getApproved[id];
        delete getLocked[id];

        emit Transfer(owner, address(0), id);
    }
    

    /*///////////////////////////////////////////////////////////////
                       INTERNAL SAFE MINT LOGIC
    //////////////////////////////////////////////////////////////*/

    function _safeMint(address to, uint256 qty) internal virtual {
        _mint(to, qty);
        
        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), nextTokenIndex-qty, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function _safeMint(
        address to,
        uint256 qty,
        bytes memory data
    ) internal virtual {
        _mint(to, qty);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), nextTokenIndex-qty, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

}

/// @notice A generic interface for a contract which properly accepts ERC721 tokens.
/// @author Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/tokens/ERC721.sol)
abstract contract ERC721TokenReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return ERC721TokenReceiver.onERC721Received.selector;
    }
}
