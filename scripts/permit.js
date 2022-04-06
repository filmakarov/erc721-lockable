var Web3 = require('web3');
const { ethers } = require("hardhat");


const SECOND = 1000;
var web3 = new Web3("https://goerli.infura.io/v3/7e8450f38dce45ec88ecff6d8bb99d4e");

const fromAddress = "0x9EE5e175D09895b8E1E28c22b961345e1dF4B5aE";
const expiry = Math.trunc((Date.now() + 120 * SECOND) / SECOND);
const nonce = 0;
const spender = "0xE1B48CddD97Fa4b2F960Ca52A66CeF8f1f8A58A5";

  
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
        chainId: "5",
        verifyingContract: "0x40B1736E0d8E4780Ceb414b65eE4BA3128c87d1d"
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