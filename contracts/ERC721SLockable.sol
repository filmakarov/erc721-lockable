// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import './ERC721S.sol';
import './IERC721Lockable.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165.sol';


/// @title Lockable Extension
/// @author filio.eth (https://twitter.com/filmakarov)
/// @dev Check the repo and readme at https://github.com/filmakarov/erc721s 

abstract contract ERC721SLockable is ERC721S, IERC721Lockable {

    /*///////////////////////////////////////////////////////////////
                            LOCKABLE EXTENSION STORAGE                        
    //////////////////////////////////////////////////////////////*/

    mapping(uint256 => address) public unlockers;

    /*///////////////////////////////////////////////////////////////
                              LOCKABLE LOGIC
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Locks the token
     */
    function _lock(address unlocker, uint256 id) internal virtual {
        unlockers[id] = unlocker;
    }

    /**
     * @dev Unlocks the token
     */
    function _unlock(uint256 id) internal virtual {
        unlockers[id] = address(0);
    }

    /**
     * @dev Public function to lock the token. Verifies if the msg.sender is the owner
     *      or approved party.
     */

    function lock(address unlocker, uint256 id) public virtual {
        address tokenOwner = ownerOf(id);
        require(msg.sender == tokenOwner || msg.sender == getApproved(id) || isApprovedForAll(tokenOwner, msg.sender)
        , "NOT_AUTHORIZED");
        require(unlockers[id] == address(0), "ALREADY_LOCKED"); 
        unlockers[id] = unlocker;
    }

    /**
     * @dev Public function to unlock the token. Only the unlocker (stated at the time of locking) can unlock
     */
    function unlock(uint256 id) public virtual {
        require(msg.sender == unlockers[id], "NOT_UNLOCKER");
        _unlock(id);
    }

    function getLocked(uint256 tokenId) public virtual view returns (address) {
        return unlockers[tokenId];
    }

    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {
        // if it is a Transfer or Burn, we always deal with one token, that is startTokenId
        if (from != address(0)) { 
            // token should not be locked or msg.sender should be unlocker to do that
            require(getLocked(startTokenId) == address(0) || msg.sender == getLocked(startTokenId), "LOCKED");
        }
    }

    // override getApproved
    // Unlocker of the token is always approved thus able to transfer this token
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        address unlocker = getLocked(tokenId);
        if (msg.sender == unlocker) {
            return unlocker;
        } else {
            return super.getApproved(tokenId);
        }
    } 

    function _afterTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {
        // if it is a Transfer or Burn, we always deal with one token, that is startTokenId
        if (from != address(0)) { 
            // clear locks
            delete unlockers[startTokenId];
        }
    }

    /*///////////////////////////////////////////////////////////////
                              ERC165 LOGIC
    //////////////////////////////////////////////////////////////*/

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == type(IERC721Lockable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

}

