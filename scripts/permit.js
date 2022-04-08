const { ethers } = require("hardhat");

async function main() {
  const SECOND = 1000;

  let provider = await new ethers.providers.JsonRpcProvider(process.env.RPC_NODE_URL_RINKEBY);

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const randomWallet = new ethers.Wallet("0x3141592653589793238462643383279502884197169399375105820974944592", provider);

  const fromAddress = process.env.SIGNER;
  const expiry = Math.trunc((Date.now() + 1200 * SECOND) / SECOND);
  const nonce = 0;
  const spender = randomWallet.address;

  console.log(spender);

  const typedData = {
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
      PermitAll: [
          { name: 'signer', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
      ]
    },
    primaryType: "PermitAll",
    domain: {
      name: "MockNFT",
      version: '1',
      chainId: 4,
      verifyingContract: "0xE27c90d8BF9ccE31E092E7D563B338B1F972034b"
    },
    message: {
      signer: spender,
      spender: fromAddress,
      nonce: nonce,
      deadline: expiry
    }
  };

  let signature = await randomWallet._signTypedData(
    typedData.domain,
    { PermitAll: typedData.types.PermitAll },
    typedData.message,
  );

  console.log(signature);
  const MockNFTInstance = await ethers.getContractFactory("MockNFT");
  const MockNFT = await MockNFTInstance.attach("0xE27c90d8BF9ccE31E092E7D563B338B1F972034b");

  const tx = await MockNFT
    .connect(signer)
    .permitAll(randomWallet.address, signer.address, expiry, signature);

  console.log(tx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });