// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./MockNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is Ownable {
    bytes4 private constant FUNC_SELECTOR = bytes4(keccak256("getLocked(uint256)"));

    address payable public wallet; 
    uint256 public fee;

    struct OfferData {
        uint256 minTime;
        uint256 maxTime;
        uint256 startDiscountTime;
        uint256 price;
        uint256 discountPrice;
        uint256 endTime;
        address token;
    }

    struct RequestRefund {
        bool isRenterAgree;
        uint256 payoutAmount;
    }

    struct RequestExtend {
        bool isLandlordAgree;
        uint256 payoutAmount;
        uint256 extendedTime;
    }

    mapping(address => mapping(uint256 => mapping(address => RequestRefund)))
        public refundRequests;

    mapping(address => mapping(uint256 => mapping(address => RequestExtend)))
        public extendRequests;
    
    mapping(uint256 => mapping(address => OfferData))
        public userOffers;

    constructor(address payable _wallet, uint256 _fee) {
        wallet = _wallet;
        fee = _fee;
    }

    function offer(address _token, uint256 tokenId, uint256 minTime, uint256 maxTime, uint256 startDiscountTime, uint256 price, uint256 discountPrice)
    public 
    payable
    returns(bool)
    {   
        require(checkLock(_token, tokenId), "token is locked");
        MockNFT(_token).transferFrom(msg.sender, address(this), tokenId);
        userOffers[tokenId][msg.sender] = (OfferData({minTime: minTime, maxTime: maxTime, startDiscountTime: startDiscountTime, price: (price + price * fee / 200), discountPrice: (discountPrice + discountPrice * fee / 200), endTime: 0, token: _token}));

        return true;
    }

    function offerAll(address _token, uint256[] calldata tokenIds, uint256[] calldata minTimes, uint256[] calldata maxTimes, uint256[] calldata prices)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++) {
            require(checkLock(_token, tokenIds[i]), "token is locked");
            MockNFT(_token).transferFrom(msg.sender, address(this), tokenIds[i]);
            userOffers[tokenIds[i]][msg.sender] = (OfferData({minTime: minTimes[i], maxTime: maxTimes[i], startDiscountTime: 0, price: (prices[i] + prices[i] * fee / 200), discountPrice: 0, endTime: 0, token: _token}));
        }
        return true;
    }

    function setDiscountData(address _token, uint256[] calldata tokenIds, uint256[] calldata startDiscountTimes, uint256[] calldata discountPrices)
    public 
    payable
    returns(bool)
    {   
        for(uint i = 0; i < tokenIds.length; i++) {
            require(userOffers[tokenIds[i]][msg.sender].token == _token, "");

            MockNFT(_token).transferFrom(msg.sender, address(this), tokenIds[i]);

            userOffers[tokenIds[i]][msg.sender].discountPrice = discountPrices[i] + discountPrices[i] * fee / 200;
            userOffers[tokenIds[i]][msg.sender].startDiscountTime = startDiscountTimes[i];
        }
        return true;
    }

    function rent(address _token, address payable landlord, uint256 tokenId, uint256 rentTime) 
    public
    payable 
    returns(bool)
    {
        require(userOffers[tokenId][landlord].token == _token, "");

        uint price;
        uint feeAmount;

        if(rentTime > userOffers[tokenId][landlord].startDiscountTime) {
            price = userOffers[tokenId][landlord].startDiscountTime * userOffers[tokenId][landlord].price 
            + (rentTime - userOffers[tokenId][landlord].startDiscountTime) * userOffers[tokenId][landlord].discountPrice;
        }
        else {
            price = rentTime * userOffers[tokenId][landlord].price;
        }

        feeAmount = price * fee / 200;

        require(price + feeAmount <= msg.value, "");
        require(rentTime >=  userOffers[tokenId][landlord].minTime && rentTime <=  userOffers[tokenId][landlord].maxTime, "");

        landlord.transfer(price);
        wallet.transfer(feeAmount);

        MockNFT(_token).lock(address(this), tokenId);
        MockNFT(_token).transferFrom(address(this), msg.sender, tokenId);
        userOffers[tokenId][landlord].endTime = rentTime * 86400 + block.timestamp;

        return true;
    }

    function backToken(address _token, address landlord, uint _tokenId)
    public
    returns(bool)
    {
        require(userOffers[_tokenId][landlord].token == _token, "");
        require(msg.sender == landlord, "");
        require(userOffers[_tokenId][landlord].endTime >= block.timestamp, "");

        address renter = MockNFT(_token).ownerOf(_tokenId);

        MockNFT(_token).transferFrom(renter, landlord, _tokenId);

        return true;
    }

    function requestRefundToken(address _token, address landlord, uint _tokenId, uint _payoutAmount) 
    public
    returns(bool)
    {
        require(userOffers[_tokenId][landlord].token == _token, "");
        require(MockNFT(_token).ownerOf(_tokenId) == msg.sender, "");

        refundRequests[_token][_tokenId][landlord].isRenterAgree = true;
        refundRequests[_token][_tokenId][landlord].payoutAmount = _payoutAmount;

        return true;
    }

    function acceptRefundToken(address _token, address landlord, uint _tokenId) 
    public
    payable
    returns(bool)
    {
        require(userOffers[_tokenId][landlord].token == _token, "");
        require(msg.sender == landlord, "");

        uint _payoutAmount = refundRequests[_token][_tokenId][landlord].payoutAmount;
        address payable renter = payable(MockNFT(_token).ownerOf(_tokenId));

        if(refundRequests[_token][_tokenId][landlord].isRenterAgree == true) {
            renter.transfer(_payoutAmount);
            MockNFT(_token).transferFrom(renter, landlord, _tokenId);
        }
        else {
            revert("renter does not agree to the refund");
        }

        return true;
    }

    function requestExtendRent(address _token, address landlord, uint _tokenId, uint _payoutAmount, uint _extendedTime) 
    public
    returns(bool)
    {
        require(userOffers[_tokenId][landlord].token == _token, "");
        require(MockNFT(_token).ownerOf(_tokenId) == msg.sender, "");

        extendRequests[_token][_tokenId][landlord].isLandlordAgree = true;
        extendRequests[_token][_tokenId][landlord].payoutAmount = _payoutAmount;
        extendRequests[_token][_tokenId][landlord].extendedTime = _extendedTime;

        return true;
    }

    function acceptExtendRent(address _token, address payable landlord, uint _tokenId) 
    public
    payable
    returns(bool)
    {
        require(userOffers[_tokenId][landlord].token == _token, "");
        require(MockNFT(_token).ownerOf(_tokenId) == msg.sender, "");

        uint _extendedTime = extendRequests[_token][_tokenId][landlord].extendedTime;
        uint _payoutAmount = extendRequests[_token][_tokenId][landlord].payoutAmount;

        if(extendRequests[_token][_tokenId][landlord].isLandlordAgree == true) {
            landlord.transfer(_payoutAmount);
            userOffers[_tokenId][landlord].endTime += _extendedTime * 86400;
        }
        else {
            revert("landlord does not agree to the extend rent");
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

    function setWallet(address payable _wallet)
    external
    onlyOwner
    returns (bool) 
    {
        wallet = _wallet;

        return true;
    }

    function setFee(uint256 _fee)
    external
    onlyOwner
    returns (bool) 
    {
        fee = _fee;

        return true;
    }
}