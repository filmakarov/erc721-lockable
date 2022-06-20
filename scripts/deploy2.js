// Import utilities from Test Helpers
// const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { ethers, upgrades } = require("hardhat");
const toBN = ethers.BigNumber.from;

async function main() {

    const [deployer, addr1, addr2] = await ethers.getSigners();
    chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

    console.log(
      "Deploying contracts with the account:",
      deployer.address
    );

    const bBefore = ethers.BigNumber.from((await deployer.getBalance()).toString());  
    ///console.log("Account balance before:", await bBefore.toString()); 

    // Deploy NFT contract
    const PostNFt = await ethers.getContractFactory("FattHonoraries");
    console.log("Deploying NFT...");
    const nftContract = await PostNFt.deploy("https://site.com/1111/"); 
    await nftContract.deployed();

    const nftContractAddress = nftContract.address;
    console.log("nftContract deployed to:", nftContractAddress);

    let bAfter = ethers.BigNumber.from((await deployer.getBalance()).toString());  
    let deployCost = (bBefore.sub(bAfter));
    console.log("nftContract deploy cost:", ethers.utils.formatUnits( (deployCost) , unit = "ether" ), "eth\n====================\n");

    

    /*
      WORKING WITH CONTRACT
    */

    

    // **********
    //  TRY STUFF
    // **********

    /*

    await minterContract.connect(deployer).switchSale();

    let bBeforeTemp = ethers.BigNumber.from((await addr1.getBalance()).toString()); 
    
    let mintQty = 3;
    let totalMintCost = ethers.BigNumber.from(mintQty).mul(await minterContract.publicSalePrice());
    let tx = await minterContract.connect(addr1).order(mintQty, {value: totalMintCost});
    await tx.wait(); 

    let bAfterTemp = ethers.BigNumber.from((await addr1.getBalance()).toString()); 

    console.log("Mint cost of ", mintQty, " items at public sale: ", ethers.utils.formatUnits( bBeforeTemp.sub(bAfterTemp).sub(totalMintCost) , unit = "ether" ), "eth\n====================\n");

    //
    // Mint more, than stake, than force unstake
    //
    await nftContract.connect(deployer).setMinter(addr2.address);
    await nftContract.connect(addr2).mint(addr1.address, 990);
    console.log("total supply ", await nftContract.totalSupply());

    async function signPermitAll(operator, nonce, deadline, signer) {
      //inspired by @dievardump's implementation
      const typedData = {
          types: {
              Permit: [
                  { name: 'operator', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'deadline', type: 'uint256' },
              ],
          },
          primaryType: 'Permit',
          domain: {
              name: await nftContract.name(),
              version: '1',
              chainId: chainId,
              verifyingContract: nftContract.address,
          },
          message: {
              operator,
              nonce,
              deadline,
          },
      };
    
      const signature = await signer._signTypedData(
          typedData.domain,
          { Permit: typedData.types.Permit },
          typedData.message,
      );
    
      return signature;
    }

    let tokensToStake = [];
    for (let i=0; i<50; i++) {
      tokensToStake.push(i);
    }

    const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

    const signature = await signPermitAll(
      stakingContractAddress,
      await nftContract.noncesForAll(await addr1.address, stakingContractAddress),
      deadline,
      addr1
  );

  await stakingContract.connect(deployer).switchStaking();
  await stakingContract.connect(addr1).approveAllAndStake(tokensToStake, addr1.address, 
                deadline, signature);

  await nftContract.connect(deployer).setBaseURI("0.05");  //mock tx


  // Stake more and calculate price
  bBeforeTemp = ethers.BigNumber.from((await addr1.getBalance()).toString()); 
    
  tx = await stakingContract.connect(addr1).stake([502, 503, 504]);
  await tx.wait(); 

  bAfterTemp = ethers.BigNumber.from((await addr1.getBalance()).toString()); 

  console.log("Cost of staking 3 preapproved token is: ", ethers.utils.formatUnits( bBeforeTemp.sub(bAfterTemp)) , unit = "ether");
  console.log("total staked addr1 ", await stakingContract.stakedBalanceOf(addr1.address));


  // force unstake all calculate
  bBeforeTemp = ethers.BigNumber.from((await deployer.getBalance()).toString()); 
    
  tx = await stakingContract.connect(deployer).forceUnstakeAll();
  await tx.wait(); 

  bAfterTemp = ethers.BigNumber.from((await deployer.getBalance()).toString()); 

  console.log("Cost of force Unstake, 993 minted, 53 staked: ", ethers.utils.formatUnits( bBeforeTemp.sub(bAfterTemp)) , unit = "ether");

  */
 
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });