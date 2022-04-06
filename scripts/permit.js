var Web3 = require('web3');
const { ethers } = require("hardhat");

const SECOND = 1000;
var web3 = new Web3("https://rinkeby.infura.io/v3/7e8450f38dce45ec88ecff6d8bb99d4e");

const fromAddress = process.env.SIGNER;
const expiry = Math.trunc((Date.now() + 120 * SECOND) / SECOND);
const nonce = 0;
const spender = process.env.SPENDER;

  
    const typedData = JSON.stringify({
      types: {
        EIP712Domain: [
          {
            name: "name",
            type: "string"
          },
          {
            name: "version",
            type: "string"
          },
          {
            name: "chainId",
            type: "uint256"
          },
          {
            name: "verifyingContract",
            type: "address"
          }
        ],
        Permit: [
            { name: 'signer', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
      },
      primaryType: "Permit",
      domain: {
        name: "MockNFT",
        version: '1',
        chainId: "4",
        verifyingContract: "0x356D9A6a699B5C2F080FFbA653683D1efF5a79af"
      },
      message: {
        signer: fromAddress,
        spender: spender,
        nonce: nonce,
        deadline: expiry
      }
    });
  //web3.eth.signTypedData(typedData, process.env.WALLET);
  web3.currentProvider.send({
    method: "eth_signTypedData_v4",
    params: [fromAddress, typedData],
    from: fromAddress
  },
  function (err, result) {
    if (err) return console.dir(err);
    if (result.error) return console.error('ERROR', result);
    console.log('TYPED SIGNED:' + JSON.stringify(result.result));
  });