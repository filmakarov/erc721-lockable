// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./ERC721s.sol";

contract NFTMarketplace {
    bytes4 private constant FUNC_SELECTOR = bytes4(keccak256("getLocked(uint256)"));

    constructor() {

    }

    function offer(address _token, uint256 tokenId, uint256 minTime, uint256 maxTime, uint256 startDiscountTime)
    public 
    payable
    returns(bool)
    {

    }

    function isLockingContract(address _contract) 
    public 
    view
    returns(bool)
    {
        bool success;
        bytes memory data = abi.encodeWithSelector(FUNC_SELECTOR, 0);
        assembly {
            success := call(
                gas(),
                _contract,
                0,
                add(data, 32),
                mload(data),   
                0,             
                0         
            )
        }
        return success;
    }

    function checkLock(address _token, uint256 tokenId) 
    public 
    view
    returns(bool)
    {
        require(isLockingContract(_token), "contract does not support locking");
        address locker = ERC721s(_token).getLocked(tokenId);
        return locker == address(0) ? true : false;
    }
}