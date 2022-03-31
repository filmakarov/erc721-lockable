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

    event Transfer(address indexed from, address indexed to, uint256 indexed id);

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

    mapping(address => uint256) public balanceOf;

    mapping(uint256 => address) public owners;

    uint256 public totalSupply;

    mapping(uint256 => address) public getApproved;

    mapping(address => mapping(address => bool)) public isApprovedForAll;

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
            balanceOf[from]--;

            balanceOf[to]++;
        }

        owners[id] = to;

        uint256 nextId = id+1;

        //to prevent new owner to become the owner of next tokens in the batch 
        if (owners[nextId] == address(0)) {  //if that was not the last token of batch
            if (_exists(nextId)) { //and the next token exists (was minted)
                owners[nextId] = from; //explicitly set the owner for that token
            }
        }

        delete getApproved[id];

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
        bytes memory data
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
        return id < totalSupply;
    }

    /*///////////////////////////////////////////////////////////////
                              CUSTOM OwnerOf FOR BATCH MINTING
    //////////////////////////////////////////////////////////////*/

    function ownerOf(uint256 id) public view returns (address) {
        require(_exists(id), "NOT_MINTED_YET");

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
                              ERC721s LOGIC
    //////////////////////////////////////////////////////////////*/
    
    function _lock(address unlocker, uint256 id) internal virtual {
        getLocked[id] = unlocker;
    }

    function _unlock(uint256 id) internal virtual {
        getLocked[id] = address(0);
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

    function _mint(address to, uint256 qty, bool safe) internal virtual {
        require(to != address(0), "INVALID_RECIPIENT");
        require(qty != 0, "CAN_NOT_MINT_0");

        // put just the first owner in the batch
        owners[totalSupply]=to;

        // check if receiver identifies itself ERC721TokenReceiver only once per batch 
        if (safe)
                require(
                    to.code.length == 0 ||
                        ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), totalSupply, "") ==
                        ERC721TokenReceiver.onERC721Received.selector,
                    "UNSAFE_RECIPIENT"
                );

        for (uint256 i=0; i<qty; i++) {
            emit Transfer(address(0), to, totalSupply+i);
        }

        // Counter overflow is incredibly unrealistic here.
        unchecked {
                balanceOf[to] += qty;
                totalSupply += qty;
            }
        
    }

    function _burn(uint256 id) internal virtual {
        address owner = ownerOf(id);

        require(owner != address(0), "NOT_MINTED");

        // Ownership check above ensures no underflow.
        unchecked {
            balanceOf[owner]--;
        }

        delete owners[id];

        delete getApproved[id];

        emit Transfer(owner, address(0), id);
    }
    

    /*///////////////////////////////////////////////////////////////
                       INTERNAL SAFE MINT LOGIC
    //////////////////////////////////////////////////////////////*/

    function _safeMint(address to, uint256 qty) internal virtual {
        _mint(to, qty, true);
    }

}

/// @notice A generic interface for a contract which properly accepts ERC721 tokens.
/// @author Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/tokens/ERC721.sol)
interface ERC721TokenReceiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 id,
        bytes calldata data
    ) external returns (bytes4);
}
