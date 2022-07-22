// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployments, getNamedAccounts, ethers } = require('hardhat');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const toBN = ethers.BigNumber.from;

describe('ERC721 Open Zeppelin LOCKABLE TESTS', () => {
  let deployer;
  let random;
  let random2;
  let unlocker;
  let holder;
  let spender;
  let allowancesigner;
  let operator;
  const ADDRESS_ZERO = ethers.constants.AddressZero;
  const mybase = "https://mybase.com/json/";
  let globalStartIndex = 0;

  const provider = ethers.provider;
  const { hexlify, toUtf8Bytes } = ethers.utils;

  beforeEach(async () => {
      [deployer, random, random2, unlocker, holder, spender, allowancesigner, operator] = await ethers.getSigners();

      // get chainId
      chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

      const MockNFT = await ethers.getContractFactory('MockNFTERC721OZ', deployer);
      nftContract = await MockNFT.deploy(mybase);
  });

  describe('Deployment', async function () {
    it('deploys', async function () {
        expect(nftContract.address).to.not.equal("");
    });
  });

     /*  ====== ====== ====== ====== ====== ======
    *   
    *   ERC721 OZ LOCKING AND UNLOCKING TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */

     describe('ERC721 Open Zeppelin Lockable NFT Locking and unlocking tests', async function () {

      beforeEach(async () => {      
        let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
        const result = await txPrelMint.wait();
        globalStartIndex = result.events[0].args.tokenId;
        //console.log((await nftContract.totalSupply()).toString());
      });

      it('Owner can lock his own token', async function () {
        
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        //console.log("tokenId: ", randomTokenId);

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());
      });

      it('Owner can not approve locked token', async function () {
        
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        //console.log("tokenId: ", randomTokenId);

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

        await expect(
          nftContract.connect(holder).approve(await random2.getAddress(), randomTokenId),
        ).to.be.revertedWith('Can not approve locked token');

      });

      it('Non Owner can not lock token', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));

        await expect(
          nftContract.connect(random).lock(await unlocker.getAddress(), randomTokenId),
        ).to.be.revertedWith('NOT_AUTHORIZED');
      });

      it('Approved can not lock token', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));

        //console.log(await nftContract.ownerOf(randomTokenId) , " holder: ", await holder.getAddress() );

        await nftContract.connect(holder).approve(await random2.getAddress(), randomTokenId);
        //console.log("approve ok");

        await expect(
          nftContract.connect(random2).lock(await unlocker.getAddress(), randomTokenId),
        ).to.be.revertedWith('NOT_AUTHORIZED');

      });

      it('Approved For All can lock token', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));

        expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

        // verify that operator is not approved before permit is used
        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.false;

        //check that before approval was not able to lock
        await expect(
          nftContract.connect(operator).lock(await unlocker.getAddress(), randomTokenId)
        ).to.be.revertedWith('NOT_AUTHORIZED');

        await nftContract.connect(holder).setApprovalForAll(await operator.getAddress(), true);
        await nftContract.connect(operator).lock(await unlocker.getAddress(), randomTokenId);

        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());
      });

      it('Non unlocker even holder can not unlock', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        await expect(
          nftContract.connect(holder).unlock(randomTokenId),
        ).to.be.revertedWith('NOT_UNLOCKER');
      });

      it('Unlocker can unlock', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        //lock
        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);
        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

        //unlock
        await nftContract.connect(unlocker).unlock(randomTokenId);
        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(ADDRESS_ZERO);
      });

      it('owner can not transfer locked token', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        await expect(
          nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId),
        ).to.be.revertedWith('LOCKED');
      });

      it('Unlocker can transfer locked token', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        //lock
        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);
        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

        //unlock
        await nftContract.connect(unlocker).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId);
        expect(await nftContract.ownerOf(randomTokenId)).to.be.equal(await random2.getAddress()).and.not.to.be.equal(ADDRESS_ZERO);
      });
      
  });
  

});