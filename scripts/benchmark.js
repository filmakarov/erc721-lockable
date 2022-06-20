// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, upgrades } = require("hardhat");
const toBN = ethers.BigNumber.from;

async function main() {
  const [deployer, addr1, addr2, addr3] = await ethers.getSigners();

  for(let i = 1; i <= 10; i++){
    let BNFT = await ethers.getContractFactory("BenchNFT");
    const bnft = await BNFT.deploy("mybase.com/");
    await bnft.deployed();

    let BNFTa = await ethers.getContractFactory("BenchNFTa");
    const bnfta = await BNFTa.deploy("mybase.com/");
    await bnfta.deployed();

    //console.log("Mock NFT for Benchmark deployed to:", bnft.address);

    let mintQty = 10;
    let totalMintCost = ethers.BigNumber.from(mintQty).mul(await bnft.itemPrice());
    
    // Preliminary mint
    await bnft.mint(addr1.address, mintQty, {value: totalMintCost});
    await bnfta.mint(addr1.address, mintQty, {value: totalMintCost});
    
    //main mint
    let benchMintCost = ethers.BigNumber.from(i).mul(await bnft.itemPrice());
    
    let bnft_mint_tx = await bnft.mint(addr2.address, i, {value: benchMintCost});
    let bnft_mint_tx_a = await bnfta.mint(addr2.address, i, {value: benchMintCost});
    console.log("Mint: ", i, " S: ", (await bnft_mint_tx.wait()).gasUsed.toString(), " A: ", (await bnft_mint_tx_a.wait()).gasUsed.toString());
    
    //transfers
    if (i == 10) {
    let minted = ethers.BigNumber.from((await bnft.totalMinted()).toString());
    console.log(minted.toString());

      for(let j = 1; j <= 10; j++){
        let tokenId = minted.sub(j);

        //console.log ("Trying to transfer from ", addr2.address, ". The owner is: ", await bnft.ownerOf(tokenId), ".");

        let bnft_transfer_tx = await bnft.connect(addr2).transferFrom(addr2.address, addr3.address, tokenId);
        let bnft_transfer_tx_a = await bnfta.connect(addr2).transferFrom(addr2.address, addr3.address, tokenId);
        console.log("Transfer: ", tokenId.toString(), " S: ", (await bnft_transfer_tx.wait()).gasUsed.toString(), " A: ", (await bnft_transfer_tx_a.wait()).gasUsed.toString());
      }
    }
    
  }

/*
Mint:  1   81580
Mint:  2   83546
Mint:  3   85512
Mint:  4   87478

Mint:  5   89444

Mint:  6   91410
Mint:  7   93376
Mint:  8   95342
Mint:  9   97308
Mint:  10   99274 
*/

  /*
  Transfer:  19   101925
Transfer:  18   82462
Transfer:  17   80222
Transfer:  16   77982
Transfer:  15   75742

Transfer:  14   73502

Transfer:  13   71262
Transfer:  12   69022
Transfer:  11   66782
Transfer:  10   47442
*/
  


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });