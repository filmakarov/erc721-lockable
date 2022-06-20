// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract MockUnsafeNFTReceiver {  

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() {}

    function onERC721Received(
    address _operator,
    address _from,
    uint256 _tokenId,
    bytes calldata _data
  )
    external
    pure
    returns(bytes4)
  {
    _operator;
    _from;
    _tokenId;
    _data;
    return 0xffffffff;
  }

}


