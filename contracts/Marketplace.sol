// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./MockNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is Ownable {
    bytes4 private constant FUNC_SELECTOR = bytes4(keccak256("getLocked(uint256)"));

    address payable public wallet; 

    struct OfferData {
        uint256 minTime;
        uint256 maxTime;
        uint256 startDiscountTime;
        uint256 price;
        uint256 discountPrice;
        uint256 endTime;
        address token;
    }
    
    mapping(uint256 => mapping(address => OfferData))
        public userOffers;

    constructor() {

    }

    function offer(address _token, uint256 tokenId, uint256 minTime, uint256 maxTime, uint256 startDiscountTime, uint256 price, uint256 discountPrice)
    public 
    payable
    returns(bool)
    {   
        require(checkLock(_token, tokenId), "token is locked");
        MockNFT(_token).transferFrom(msg.sender, address(this), tokenId);
        userOffers[tokenId][msg.sender] = (OfferData({minTime: minTime, maxTime: maxTime, startDiscountTime: startDiscountTime, price: price, discountPrice: discountPrice, endTime: 0, token: _token}));

        return true;
    }

    function offerAll(address _token, uint256[] calldata tokenIds, uint256[] calldata minTimes, uint256[] calldata maxTimes, uint256[] calldata prices)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++)
        {
            require(checkLock(_token, tokenIds[i]), "token is locked");
            MockNFT(_token).transferFrom(msg.sender, address(this), tokenIds[i]);
            userOffers[tokenIds[i]][msg.sender] = (OfferData({minTime: minTimes[i], maxTime: maxTimes[i], startDiscountTime: 0, price: prices[i], discountPrice: 0, endTime: 0, token: _token}));
        }
        return true;
    }

    function setDiscountData(address _token, uint256[] calldata tokenIds, uint256[] calldata startDiscountTimes, uint256[] calldata discountPrices)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++)
        {
            require(userOffers[tokenId][msg.sender].token != address(0), "");

            MockNFT(_token).transferFrom(msg.sender, address(this), tokenIds[i]);

            userOffers[tokenIds[i]][msg.sender].discountPrice = discountPrices[i];
            userOffers[tokenIds[i]][msg.sender].startDiscountTime = startDiscountTimes[i];
        }
        return true;
    }

    function rent(address _token, address landlord, uint256 tokenId, uint256 rentTime) 
    public
    payable 
    returns(bool)
    {
        require(userOffers[tokenId][landlord].token != address(0), "");

        uint price;

        if(rentTime > userOffers[tokenId][landlord].startDiscountTime) {
            price = userOffers[tokenId][landlord].startDiscountTime * userOffers[tokenId][landlord].price 
            + (rentTime - userOffers[tokenId][landlord].startDiscountTime) * userOffers[tokenId][landlord].discountPrice;
        }
        else {
            price = rentTime * userOffers[tokenId][landlord].price;
        }

        require(userOffers[tokenId][landlord].price == msg.value, "");
        require(rentTime >=  userOffers[tokenId][landlord].minTime && rentTime <=  userOffers[tokenId][landlord].maxTime, "");

        wallet.transfer(msg.value);

        MockNFT(_token).lock(address(this), tokenId);
        MockNFT(_token).transferFrom(address(this), msg.sender, tokenId);
       userOffers[tokenId][landlord].endTime = rentTime + block.timestamp;

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

    function _setWallet(address payable _wallet)
        external
        onlyOwner
        returns (bool) 
    {
        wallet = _wallet;

        return true;
    }
}