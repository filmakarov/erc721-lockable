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
        uint256 tokenId;
        uint256 price;
        uint256 discountPrice;
        uint256 endTime;
        address _token;
    }

    mapping(address => OfferData[]) public userOffers;

    constructor() {

    }

    function offer(address _token, uint256 tokenId, uint256 minTime, uint256 maxTime, uint256 startDiscountTime, uint256 price, uint256 discountPrice)
    public 
    payable
    returns(bool)
    {   
        require(checkLock(_token, tokenId), "token is locked");
        MockNFT(_token).transferFrom(msg.sender, address(this), tokenId);
        userOffers[msg.sender].push(OfferData({tokenId: tokenId, minTime: minTime, maxTime: maxTime, startDiscountTime: startDiscountTime, price: price, discountPrice: discountPrice, endTime: 0, _token: _token}));

        return true;
    }

    function offerAll(address _token, uint256[] calldata tokenIds, uint256[] calldata minTimes, uint256[] calldata maxTimes, uint256 startDiscountTime, uint256[] calldata prices, uint256 discountPrice)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++)
        {
            require(checkLock(_token, tokenIds[i]), "token is locked");
            MockNFT(_token).transferFrom(msg.sender, address(this), tokenIds[i]);
            userOffers[msg.sender].push(OfferData({tokenId: tokenIds[i], minTime: minTimes[i], maxTime: maxTimes[i], startDiscountTime: startDiscountTime, price: prices[i], discountPrice: discountPrice, endTime: 0, _token: _token}));
        }
        return true;
    }

    function rent(address _token, address landlord, uint256 tokenId, uint256 rentTime) 
    public
    payable
    returns(bool)
    {
        uint numOffer = userOffers[landlord].length;
        uint price;

        for(uint i = 0; i < userOffers[landlord].length - 1; i++) {
            if (userOffers[landlord][i].tokenId == tokenId) {
                numOffer = i;
                break;
            }
        }

        if(rentTime > userOffers[landlord][numOffer].startDiscountTime) {
            price = userOffers[landlord][numOffer].startDiscountTime * userOffers[landlord][numOffer].price 
            + (rentTime - userOffers[landlord][numOffer].startDiscountTime) * userOffers[landlord][numOffer].discountPrice;
        }
        else {

        }

        require(numOffer < userOffers[landlord].length, "");
        require(userOffers[landlord][numOffer].price == msg.value, "");
        require(rentTime >=  userOffers[landlord][numOffer].minTime && rentTime <=  userOffers[landlord][numOffer].maxTime, "");

        wallet.transfer(msg.value);

        MockNFT(_token).lock(address(this), tokenId);
        MockNFT(_token).transferFrom(address(this), msg.sender, tokenId);
        userOffers[landlord][numOffer].endTime = rentTime + block.timestamp;

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