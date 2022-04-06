// $ npx hardhat run scripts/04_deploy_ERC721Mint.js --network rinkeby
const networks = hre.network.name;
const fs = require('fs');

async function main() {
  const namesAndAddresses = {};
  const [deployer] = await hre.ethers.getSigners();

  const MockNFTInstance = await ethers.getContractFactory('MockNFT');
  const MockNFT = await MockNFTInstance.deploy(process.env.NFT_URI);

  console.log('Network', networks);
  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  console.log(`Smart contract has been deployed to: ${MockNFT.address}`);

  namesAndAddresses.MockNFT = MockNFT.address;

  const data = await JSON.stringify(namesAndAddresses, null, 2);
  const dir = './networks/';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const fileName = 'MockNFT_' + `${networks}.json`;

  await fs.writeFileSync(dir + fileName, data, { encoding: 'utf8' });

  const network = await ethers.getDefaultProvider().getNetwork();
  console.log(network);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });