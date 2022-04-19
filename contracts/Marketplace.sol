// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./ERC721s.sol";

contract NFTMarketplace {
    bytes4 private constant FUNC_SELECTOR = bytes4(keccak256("getLocked(uint256)"));

    struct OfferData {
        uint256 minTime;
        uint256 maxTime;
        uint256 startDiscountTime;
        uint256 tokenId;
        uint256 price;
        address _token;
    }

    mapping(address => OfferData[]) public userOffers;

    constructor() {

    }

    function offer(address _token, uint256 tokenId, uint256 minTime, uint256 maxTime, uint256 startDiscountTime, uint256 price)
    public 
    payable
    returns(bool)
    {   
        require(checkLock(_token, tokenId), "token is locked");
        ERC721s(_token).transferFrom(msg.sender, address(this), tokenId);
        userOffers[msg.sender].push(OfferData({tokenId: tokenId, minTime: minTime, maxTime: maxTime, startDiscountTime: startDiscountTime, price: price, _token: _token}));

        return true;
    }

    function offerAll(address _token, uint256[] calldata tokenIds, uint256[] calldata minTimes, uint256[] calldata maxTimes, uint256[] calldata startDiscountTimes, uint256[] calldata prices)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++)
        {
            require(checkLock(_token, tokenIds[i]), "token is locked");
            ERC721s(_token).transferFrom(msg.sender, address(this), tokenIds[i]);
            userOffers[msg.sender].push(OfferData({tokenId: tokenIds[i], minTime: minTimes[i], maxTime: maxTimes[i], startDiscountTime: startDiscountTimes[i], price: prices[i], _token: _token}));
        }
        return true;
    }

    function offerAll(address _token, uint256[] calldata tokenIds, uint256 minTime, uint256 maxTime, uint256 startDiscountTime, uint256 price)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++)
        {
            require(checkLock(_token, tokenIds[i]), "token is locked");
            ERC721s(_token).transferFrom(msg.sender, address(this), tokenIds[i]);
            userOffers[msg.sender].push(OfferData({tokenId: tokenIds[i], minTime: minTime, maxTime: maxTime, startDiscountTime: startDiscountTime, price: price, _token: _token}));
        }

        return true;
    }

    function isLockingContract(address _contract) 
    public
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
    returns(bool)
    {
        require(isLockingContract(_token), "contract does not support locking");
        address locker = ERC721s(_token).getLocked(tokenId);
        return locker == address(0) ? true : false;
    }
}