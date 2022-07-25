// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployments, getNamedAccounts, ethers } = require('hardhat');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const toBN = ethers.BigNumber.from;

describe('ERC721S TESTS', () => {
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

  const provider = ethers.provider;
  const { hexlify, toUtf8Bytes } = ethers.utils;

  beforeEach(async () => {
      [deployer, random, random2, unlocker, holder, spender, allowancesigner, operator] = await ethers.getSigners();

      // get chainId
      chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

      const MockNFT = await ethers.getContractFactory('MockNFTERC721S', deployer);
      nftContract = await MockNFT.deploy(mybase);
  });

  describe('Deployment', async function () {
    it('deploys', async function () {
        expect(nftContract.address).to.not.equal("");
    });
    it('deploys with correct base URI', async function () {
      const mintQty = 3;
      await nftContract.connect(random).mint(await random.getAddress(), mintQty);
      /*
      console.log(await nftContract.nextTokenIndex());
      for (let i =0; i<await nftContract.nextTokenIndex(); i++) {
        console.log(await nftContract.owners(i));
      }
      */
      expect(await nftContract.tokenURI((await nftContract.nextTokenIndex()).sub(1))).to.include(mybase);      
    });
    it('deploys with 0 tokens', async function () {
      expect(await nftContract.totalMinted()).to.equal(0);
    });
    it('has correct nextTokenIndex', async function () {
      expect(await nftContract.nextTokenIndex()).to.equal(5);
      //console.log("Next Token Id: " , await nftContract.nextTokenIndex());
    });
  });

  /*  ====== ====== ====== ====== ====== ======
    *   
    *   ERC721S APPROVALS
    * 
    * ====== ====== ====== ====== ======  ====== */

  describe('ERC721S Approvals', async function () {

    beforeEach(async () => {   
      let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
      await txPrelMint.wait();
      //console.log((await nftContract.totalMinted()).toString());
    });

    // APPROVALS FOR ALL
    it('can create operator records with SetApprovalForAll', async function () { 
      let txAppr = await nftContract.connect(holder).setApprovalForAll(await spender.getAddress(), true) ;
      await txAppr.wait();

      expect(await nftContract.isApprovedForAll(await holder.getAddress(), await spender.getAddress())).to.be.true;
    });

    //can discard approvals
    it('can discrad approvals with SetApprovalForAll', async function () { 
      let txAppr = await nftContract.connect(holder).setApprovalForAll(await spender.getAddress(), true) ;
      await txAppr.wait();

      expect(await nftContract.isApprovedForAll(await holder.getAddress(), await spender.getAddress())).to.be.true;

      txAppr = await nftContract.connect(holder).setApprovalForAll(await spender.getAddress(), false) ;
      await txAppr.wait();

      expect(await nftContract.isApprovedForAll(await holder.getAddress(), await spender.getAddress())).to.be.false;
    });

    // approvals
    it('holder can approve', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
      //console.log("random token: ", await randomTokenId.toString());

      expect(await nftContract.getApproved(randomTokenId)).to.equal(ADDRESS_ZERO);

      let txAppr = await nftContract.connect(holder).approve(spender.getAddress(), randomTokenId);
      await txAppr.wait();

      expect(await nftContract.getApproved(randomTokenId)).to.equal(await spender.getAddress());
    });

    it('operator can approve', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
      //console.log("random token: ", await randomTokenId.toString());

      let txAppr = await nftContract.connect(holder).setApprovalForAll(await spender.getAddress(), true) ;
      await txAppr.wait();

      expect(await nftContract.isApprovedForAll(await holder.getAddress(), await spender.getAddress())).to.be.true; 
      expect(await nftContract.getApproved(randomTokenId)).to.equal(ADDRESS_ZERO);

      txAppr = await nftContract.connect(spender).approve(random2.getAddress(), randomTokenId);
      await txAppr.wait();

      expect(await nftContract.getApproved(randomTokenId)).to.equal(await random2.getAddress());
    });

    it('non holder can not approve', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      expect(await nftContract.getApproved(randomTokenId)).to.equal(ADDRESS_ZERO);

      await expect(
        nftContract.connect(random).approve(spender.getAddress(), randomTokenId),
      ).to.be.revertedWith('ERC721S: Not authorized to approve');
    });
  });

  /*  ====== ====== ====== ====== ====== ======
    *   
    *   ERC721S MINTS
    * 
    * ====== ====== ====== ====== ======  ====== */

describe('ERC721S MINTS', async function () {

  it('can mint: ownerOf and balanceOf are recorded correctly', async function () {
    let mintQty = 10;
    let balBefore = await nftContract.balanceOf(await holder.getAddress());
    let start = await nftContract.nextTokenIndex();
    //console.log(start);

    let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), mintQty);
    await txPrelMint.wait();

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(balBefore.add(mintQty));

    let finish = (await nftContract.nextTokenIndex());
    //console.log(finish);

    for (let i=start; i.lt(finish); i=i.add(1)) {
      //console.log(await nftContract.ownerOf(i));
      expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
    }

  });

  // can not mint to 0 address
  it('can not mint to 0 address', async function () {    
    await expect(
      nftContract.connect(holder).mint(ZERO_ADDRESS, 5),
    ).to.be.revertedWith("ERC721S: Can not mint to 0 address");
  });

  // can not mint 0 tokens
  it('can not mint 0 tokens', async function () {    
    await expect(
      nftContract.connect(holder).mint(await random2.getAddress(), 0),
    ).to.be.revertedWith("ERC721S: Can not mint 0 tokens");
  });

  // owner for the batch head recorded correctly
  it('owner for the batch head recorded correctly', async function () {
    let mintQty = 10;
    let balBefore = await nftContract.balanceOf(await holder.getAddress());

    let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), mintQty);
    await txPrelMint.wait();

    expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(balBefore.add(mintQty));
    let batchHeadId = (await nftContract.nextTokenIndex()).sub(mintQty);
    expect(await nftContract.ownerOf(batchHeadId)).to.equal(await holder.getAddress());
  });

  // totalMinted increased correctly
  it('totalMinted increased correctly', async function () {
    let mintQty = 10;
    let tmBefore = await nftContract.totalMinted();

    let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), mintQty);
    await txPrelMint.wait();

    expect(await nftContract.totalMinted()).to.equal(tmBefore.add(mintQty));
  });

  // safeMint to the NFT non-receiver contract does not work
  it('cannot _safeMint to NFT non-receiver contract', async function () {
    const MockNonReceiver = await ethers.getContractFactory('MockNFTNonReceiver', deployer);
    mockNonReceiver = await MockNonReceiver.deploy("https://onchain.meta/");
    
    await expect(
      nftContract.connect(holder).mint(await mockNonReceiver.address, 5),
    ).to.be.reverted;
  });

  it('cannot _safeMint to Wrong NFT receiver contract', async function () {
    const MockUnsafe = await ethers.getContractFactory('MockUnsafeNFTReceiver', deployer);
    mockUnsafe = await MockUnsafe.deploy();
    
    await expect(
      nftContract.connect(holder).mint(await mockUnsafe.address, 5),
    ).to.be.revertedWith("ERC721S: Mint to unsafe recepient");
  });

  // safeMint to the NFT receiver contract works
  it('can _safeMint to safe NFT receiver contract', async function () {
    const MockSafe = await ethers.getContractFactory('MockSafeNFTReceiver', deployer);
    mockSafe = await MockSafe.deploy();

    let mintQty = 5;
    
    await nftContract.connect(holder).mint(await mockSafe.address, mintQty);

    expect(await nftContract.balanceOf(await mockSafe.address)).to.equal(mintQty);
    
  });

});

  /*  ====== ====== ====== ====== ====== ======
    *   
    *   ERC721S TRANSFERS
    * 
    * ====== ====== ====== ====== ======  ====== */

  describe('ERC721S Transfers', async function () {

    beforeEach(async () => {      
      let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
      await txPrelMint.wait();
      //console.log((await nftContract.totalSupply()).toString());
    });

    // transfers functions
    it('owner can transfer', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      let tx = await nftContract.connect(holder).transferFrom(holder.getAddress(), random.getAddress(), randomTokenId)
      await tx.wait();

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await random.getAddress());

    });

    it('can not transfer from non owner', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      await expect(
        nftContract.connect(random).transferFrom(random2.getAddress(), random.getAddress(), randomTokenId),
      ).to.be.revertedWith('ERC721S: From is not the owner');
    });

    it('can not transfer to zero address', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      await expect(
        nftContract.connect(holder).transferFrom(holder.getAddress(), ZERO_ADDRESS, randomTokenId),
      ).to.be.revertedWith('ERC721S: Can not transfer to 0 address');
    });

    it('owner can not transfer locked token', async function () {
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

      await expect(
        nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId),
      ).to.be.revertedWith('Lockable: token is locked');
    });

    it('Unlocker can transfer locked token and it unlocks after transfer', async function () {

      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
      
      //lock
      await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);
      expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

      //transfer
      await nftContract.connect(unlocker).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId);
      expect(await nftContract.ownerOf(randomTokenId)).to.be.equal(await random2.getAddress()).and.not.to.be.equal(ADDRESS_ZERO);
      expect(await nftContract.getLocked(randomTokenId)).to.equal(ADDRESS_ZERO);
    });

    it('spender can transfer', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      let txAppr = await nftContract.connect(holder).approve(spender.getAddress(), randomTokenId);
      await txAppr.wait();

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

      let tx = await nftContract.connect(spender).transferFrom(holder.getAddress(), random.getAddress(), randomTokenId)
      await tx.wait();

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await random.getAddress());
    });

    it('operator can transfer', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      let txAppr = await nftContract.connect(holder).setApprovalForAll(await operator.getAddress(), true) ;
      await txAppr.wait();
      expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.true;

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

      let tx = await nftContract.connect(operator).transferFrom(holder.getAddress(), random.getAddress(), randomTokenId)
      await tx.wait();

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await random.getAddress());
    });
    
    it('non authorized can not transfer', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

      await expect(
        nftContract.connect(random).transferFrom(holder.getAddress(), random2.getAddress(), randomTokenId),
      ).to.be.revertedWith('ERC721S: Not authorized to transfer');
    });

    it('spender can transfer', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      let txAppr = await nftContract.connect(holder).approve(spender.getAddress(), randomTokenId);
      await txAppr.wait();

      expect(await nftContract.getApproved(randomTokenId)).to.equal(await spender.getAddress());
      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

      let tx = await nftContract.connect(spender).transferFrom(holder.getAddress(), random.getAddress(), randomTokenId)
      await tx.wait();

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await random.getAddress());
      expect(await nftContract.getApproved(randomTokenId)).to.equal(ADDRESS_ZERO);
    });

    it('balances change correctly after transfer', async function () { 
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      let holderBalBefore = await nftContract.balanceOf(await holder.getAddress());
      let receiverBalBefore = await nftContract.balanceOf(await random.getAddress());

      let tx = await nftContract.connect(holder).transferFrom(holder.getAddress(), random.getAddress(), randomTokenId)
      await tx.wait();
      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await random.getAddress());

      expect(await nftContract.balanceOf(await holder.getAddress())).to.equal(holderBalBefore.sub(1));
      expect(await nftContract.balanceOf(await random.getAddress())).to.equal(receiverBalBefore.add(1));

    });

    // safeTransfer to the EOA works
    it('can safeTransferFrom to EOA', async function () {
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      await 
        nftContract.connect(holder)["safeTransferFrom(address,address,uint256)"](await holder.getAddress(), await random2.getAddress(), randomTokenId);

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await random2.getAddress());
    });

    // safeTransfer to the NFT non-receiver contract not works
    it('cannot safeTransferFrom to unsafe NFT receiver contract', async function () {
      const MockUnsafe = await ethers.getContractFactory('MockUnsafeNFTReceiver', deployer);
      mockUnsafe = await MockUnsafe.deploy();

      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      await expect(
        nftContract.connect(holder)["safeTransferFrom(address,address,uint256)"](await holder.getAddress(), await mockUnsafe.address, randomTokenId),
      ).to.be.revertedWith("ERC721S: Transfer to unsafe recepient");
    });

    // safeTransfer to the NFT receiver contract works
    it('can safeTransferFrom to the safe NFT receiver contract', async function () {
      const MockSafe = await ethers.getContractFactory('MockSafeNFTReceiver', deployer);
    mockSafe = await MockSafe.deploy();

    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      await 
        nftContract.connect(holder)["safeTransferFrom(address,address,uint256)"](await holder.getAddress(), await mockSafe.address, randomTokenId);

      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await mockSafe.address);
    });

    it('can return correct owners for tokens even after transfer', async function () {

      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
      //console.log("random token2: ", await randomTokenId.toString());
      //console.log(startIndex);
      //console.log(await nftContract.nextTokenIndex());

      for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
        
        //console.log("OwnerOf(", i, "): ", await nftContract.ownerOf(i));
        //console.log("Owners[", i, "]: ", await nftContract.owners(i), "\n====================\n");

        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }

      let tx = await nftContract.connect(holder).transferFrom(holder.getAddress(), random.getAddress(), randomTokenId)
      await tx.wait();

      //console.log(await nftContract.nextTokenIndex());
/*
      for (let k=startIndex; k.lt(await nftContract.nextTokenIndex()); k=k.add(1)) {
        
        console.log("OwnerOf(", k, "): ", await nftContract.ownerOf(k));
        console.log("Owners[", k, "]: ", await nftContract.owners(k), "\n====================\n");
      }
*/
      for (let j=startIndex; j.lt(await nftContract.nextTokenIndex()); j=j.add(1)) {
        if (j.eq(randomTokenId)) {
          expect(await nftContract.ownerOf(j)).to.equal(await random.getAddress());
        }
        else {
          expect(await nftContract.ownerOf(j)).to.equal(await holder.getAddress());
        }
      }
    }); 
  });

    /*  ====== ====== ====== ====== ====== ======
    *   
    *   ERC721S BURNS
    * 
    * ====== ====== ====== ====== ======  ====== */

describe('ERC721S BURNS', async function () {

  beforeEach(async () => {      
    let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
    await txPrelMint.wait();
    //console.log((await nftContract.totalSupply()).toString());
  });

  it('non owner can not burn', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

    await expect(
      nftContract.connect(random2).burn(randomTokenId),
    ).to.be.revertedWith("Must own to burn");

  });

  it('owner can burn token and contract state changes accordingly', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

    //console.log(randomTokenId);
    let burnCounterBefore = await nftContract.burnedCounter();
    let supplyBefore = await nftContract.totalSupply();
    let mintedBefore = await nftContract.totalMinted();
    let nextTokenBefore = await nftContract.nextTokenIndex();
    expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

    let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
    await tx_burn.wait();

    // this token is marked as burned
    expect(await nftContract.isBurned(randomTokenId)).to.be.true;

    // burn counter increases
    expect(await nftContract.burnedCounter()).to.be.equal(burnCounterBefore.add(1));

    // ownerOf reverts for burned token
    await expect(
      nftContract.ownerOf(randomTokenId),
    ).to.be.revertedWith("ERC721S: Token does not exist");
    
    // total supply decreases
    expect(await nftContract.totalSupply()).to.be.equal(supplyBefore.sub(1));

    // nextTokenIndex and totalMinted do not change
    expect(await nftContract.nextTokenIndex()).to.be.equal(nextTokenBefore);
    expect(await nftContract.totalMinted()).to.be.equal(mintedBefore);

  });

  it('owner can burn / whole range + edge cases', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);

    for (randomTokenId=startIndex; randomTokenId.lt(await nftContract.nextTokenIndex()); randomTokenId=randomTokenId.add(1))
    {
      //console.log(randomTokenId);
      let burnCounterBefore = await nftContract.burnedCounter();
      let supplyBefore = await nftContract.totalSupply();
      let mintedBefore = await nftContract.totalMinted();
      let nextTokenBefore = await nftContract.nextTokenIndex();
      expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

      let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
      await tx_burn.wait();

      // this token is marked as burned
      expect(await nftContract.isBurned(randomTokenId)).to.be.true;

      // burn counter increases
      expect(await nftContract.burnedCounter()).to.be.equal(burnCounterBefore.add(1));

      // ownerOf reverts for burned token
      await expect(
        nftContract.ownerOf(randomTokenId),
      ).to.be.revertedWith("ERC721S: Token does not exist");
      
      // total supply decreases
      expect(await nftContract.totalSupply()).to.be.equal(supplyBefore.sub(1));

      // nextTokenIndex and totalMinted do not change
      expect(await nftContract.nextTokenIndex()).to.be.equal(nextTokenBefore);
      expect(await nftContract.totalMinted()).to.be.equal(mintedBefore);
    }

  });

  it('if we burn first token in batch , it sets the next owner', async function () {
    
    let nextTokenBefore = await nftContract.nextTokenIndex();
    
    let mintQty = 5;
    let txPrelMint2 = await nftContract.connect(random).mint(await random.getAddress(), mintQty);
    await txPrelMint2.wait();

    let tx_burn = await nftContract.connect(random).burn(nextTokenBefore);
    await tx_burn.wait();

    for (let i=1; i<mintQty; i++ ) {
      expect(await nftContract.ownerOf(nextTokenBefore.add(i))).to.equal(await random.getAddress());
      if (i==1) {
        expect(await nftContract.ownerOf(nextTokenBefore.add(i))).to.equal(await random.getAddress()); 
      } else {
        expect(await nftContract.ownerOf(nextTokenBefore.add(i))).to.equal(await random.getAddress()); 
      }
    }

    /*
    for (let i=0; i<(await nftContract.nextTokenIndex()); i++) {
      
      try { console.log("OwnerOf ", i, ": ", await nftContract.ownerOf(i) ); }
      catch {}
      console.log("Owners[] ", i, ": ", await nftContract.owners(i) );
    }
    */ 

  });

  it('if we burn token from the middle of the batch, we can transfer THE NEXT token correctly', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

    // if random token to be burned is the last one, regenerate
    while (randomTokenId.eq((await nftContract.nextTokenIndex()).sub(1))) {
      randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
    }

    let burnCounterBefore = await nftContract.burnedCounter();
    let supplyBefore = await nftContract.totalSupply();
    let mintedBefore = await nftContract.totalMinted();
    let nextTokenBefore = await nftContract.nextTokenIndex();
    expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

    let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
    await tx_burn.wait();

    // this token is marked as burned
    expect(await nftContract.isBurned(randomTokenId)).to.be.true;
    // burn counter increases
    expect(await nftContract.burnedCounter()).to.be.equal(burnCounterBefore.add(1));
    // ownerOf reverts for burned token
    await expect(
      nftContract.ownerOf(randomTokenId),
    ).to.be.revertedWith("ERC721S: Token does not exist");

    for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
      if (i.toNumber() != randomTokenId) {
        //console.log('check');
        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }
    }
    
    let tx_tr = await nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId.add(1));
    await tx_tr.wait();

    for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
      if (i.toNumber() != randomTokenId && i.toNumber() != randomTokenId.add(1)) {
        //console.log('check2');
        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }
      if (i.eq(randomTokenId.add(1))){
        //console.log('check3');
        expect(await nftContract.ownerOf(i)).to.equal(await random2.getAddress());
      }
      //console.log(await nftContract.owners(i) , ". Burn: " , await nftContract.isBurned(i));
    }

  });

  it('if we burn token from the middle of the batch, we can transfer SOME next token correctly', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

     // if random token to be burned is the last one or prev, regenerate
     while (randomTokenId.gte((await nftContract.nextTokenIndex()).sub(2))) {
      randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
    }

    let burnCounterBefore = await nftContract.burnedCounter();
    let supplyBefore = await nftContract.totalSupply();
    let mintedBefore = await nftContract.totalMinted();
    let nextTokenBefore = await nftContract.nextTokenIndex();
    expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

    let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
    await tx_burn.wait();

    // this token is marked as burned
    expect(await nftContract.isBurned(randomTokenId)).to.be.true;
    // burn counter increases
    expect(await nftContract.burnedCounter()).to.be.equal(burnCounterBefore.add(1));
    // ownerOf reverts for burned token
    await expect(
      nftContract.ownerOf(randomTokenId),
    ).to.be.revertedWith("ERC721S: Token does not exist");

    for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
      if (i.toNumber() != randomTokenId) {
        //console.log('check');
        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }
    }
    
    let tx_tr = await nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId.add(2));
    await tx_tr.wait();

    for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
      if (i.toNumber() != randomTokenId && i.toNumber() != randomTokenId.add(2)) {
        //console.log('check2');
        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }
      if (i.eq(randomTokenId.add(2))){
        //console.log('check3');
        expect(await nftContract.ownerOf(i)).to.equal(await random2.getAddress());
      }
      //console.log(await nftContract.owners(i) , ". Burn: " , await nftContract.isBurned(i));
    }

  });

  it('we can transfer the token before burned one', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
    
    while (randomTokenId.eq(startIndex)) {
      //regenerate
      randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
    }

    let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
    await tx_burn.wait();

    // this token is marked as burned
    expect(await nftContract.isBurned(randomTokenId)).to.be.true;

    // ownerOf reverts for burned token
    await expect(
      nftContract.ownerOf(randomTokenId),
    ).to.be.revertedWith("ERC721S: Token does not exist");

    let tx_tr = await nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId.sub(1));
    await tx_tr.wait();

    for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
     
      if (i.toNumber() != randomTokenId && i.toNumber() != randomTokenId.sub(1)) {
       // console.log('check2');
        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }
      if (i.eq(randomTokenId.sub(1))){
      //  console.log('check3');
        expect(await nftContract.ownerOf(i)).to.equal(await random2.getAddress());
      }
      if (i.eq(randomTokenId)){
       // console.log('burned');
        await expect(
          nftContract.ownerOf(randomTokenId),
        ).to.be.revertedWith("ERC721S: Token does not exist");
      }

      //console.log("tb ", await nftContract.owners(i) , ". Burn: " , await nftContract.isBurned(i));
    }
  });

  it('we can burn the token before burned one', async function () {
      let minted = (await nftContract.totalMinted());
      let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
      let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

      if (randomTokenId.eq(startIndex)) {
        randomTokenId = randomTokenId.add(1);
      }
  
      let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
      await tx_burn.wait();
  
      // this token is marked as burned
      expect(await nftContract.isBurned(randomTokenId)).to.be.true;
  
      // ownerOf reverts for burned token
      await expect(
        nftContract.ownerOf(randomTokenId),
      ).to.be.revertedWith("ERC721S: Token does not exist");
  
      let tx_b2 = await nftContract.connect(holder).burn(randomTokenId.sub(1));
      await tx_b2.wait();
  
      for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
       
        if (i.toNumber() != randomTokenId && i.toNumber() != randomTokenId.sub(1)) {
          //console.log('check2');
          expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
        }
        else {
          //console.log('check3');
          expect(await nftContract.isBurned(i)).to.be.true;
        }
        //console.log("b2 ", await nftContract.owners(i) , ". Burn: " , await nftContract.isBurned(i));
      }
    
  });

  it('we can not transfer burned token', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

    let tx_burn = await nftContract.connect(holder).burn(randomTokenId);
    await tx_burn.wait();

    // this token is marked as burned
    expect(await nftContract.isBurned(randomTokenId)).to.be.true;

    // ownerOf reverts for burned token
    await expect(
      nftContract.ownerOf(randomTokenId),
    ).to.be.revertedWith("ERC721S: Token does not exist");

    await expect(
      nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId),
    ).to.be.reverted;

  });

  it('we can burn latest token, and mint proceeds correctly', async function () {
  
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);

    // lastToken
    let lastExisting =  (await nftContract.nextTokenIndex()).sub(1)

    let tx_burn = await nftContract.connect(holder).burn(lastExisting);
    await tx_burn.wait();

    // this token is marked as burned
    expect(await nftContract.isBurned(lastExisting)).to.be.true;

    // ownerOf reverts for burned token
    await expect(
      nftContract.ownerOf(lastExisting),
    ).to.be.revertedWith("ERC721S: Token does not exist");

    let mintQty = 5;
    let txPrelMint2 = await nftContract.connect(random).mint(await random.getAddress(), mintQty);
    await txPrelMint2.wait();

    for (let i=startIndex; i.lt(await nftContract.nextTokenIndex()); i=i.add(1)) {
       
      if (i.lt(lastExisting)) {
        expect(await nftContract.ownerOf(i)).to.equal(await holder.getAddress());
      }
      else if (i.eq(lastExisting)) {
        expect(await nftContract.isBurned(i)).to.be.true;
      }
      else {
        expect(await nftContract.ownerOf(i)).to.equal(await random.getAddress());;
      }
      //console.log("b2 ", await nftContract.owners(i) , ". Burn: " , await nftContract.isBurned(i));
    }

  });

  it('can burn last token in the batch and it does not affect next batch', async function () {
    
    let nextTokenBefore = await nftContract.nextTokenIndex();
    
    let mintQty = 5;
    let txPrelMint2 = await nftContract.connect(random2).mint(await random2.getAddress(), mintQty);
    await txPrelMint2.wait();

    //burn last token in prev btch
    let tx_burn = await nftContract.connect(holder).burn(nextTokenBefore.sub(1));
    await tx_burn.wait();

    for (let i=0; i<mintQty; i++ ) {
      expect(await nftContract.ownerOf(nextTokenBefore.add(i))).to.equal(await random2.getAddress());
    }

  });

  it('can not burn locked token', async function () {
    let minted = (await nftContract.totalMinted());
    let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
    let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

    let tx = await nftContract.connect(holder).lock(unlocker.getAddress(), randomTokenId);
    await tx.wait();

    await expect(
      nftContract.connect(holder).burn(randomTokenId),
    ).to.be.revertedWith('Lockable: token is locked');

  });


  });

     /*  ====== ====== ====== ====== ====== ======
    *   
    *   ERC721S LOCKING AND UNLOCKING TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */

     describe('ERC721S Locking and unlocking tests', async function () {

      beforeEach(async () => {      
        let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
        await txPrelMint.wait();
        //console.log((await nftContract.totalSupply()).toString());
      });

      it('Owner can lock his own token', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());
      });

      it('Owner can not lock his already locked token', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        await expect(
          nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId),
        ).to.be.revertedWith('Locking: Token is already locked');
      });

      it('Non Owner can not lock token', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

        await expect(
          nftContract.connect(random).lock(await unlocker.getAddress(), randomTokenId),
        ).to.be.revertedWith('Locking: not auhorized to lock');
      });

      it('Owner can not approve locked token', async function () {
        
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

        await expect(
          nftContract.connect(holder).approve(await random2.getAddress(), randomTokenId),
        ).to.be.revertedWith('Can not approve locked token');

      });

      it('Approved For All can lock token', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

        expect(await nftContract.ownerOf(randomTokenId)).to.equal(await holder.getAddress());

        // verify that operator is not approved before permit is used
        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.false;

        //check that before approval was not able to lock
        await expect(
          nftContract.connect(operator).lock(await unlocker.getAddress(), randomTokenId)
        ).to.be.revertedWith('Locking: not auhorized to lock');

        await nftContract.connect(holder).setApprovalForAll(await operator.getAddress(), true);
        await nftContract.connect(operator).lock(await unlocker.getAddress(), randomTokenId);

        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());
      });

      it('Non unlocker even holder can not unlock', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));

        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        await expect(
          nftContract.connect(holder).unlock(randomTokenId),
        ).to.be.revertedWith('Locking: Not allowed to unlock');
      });

      it('Unlocker can unlock', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
        
        //lock
        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);
        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

        //unlock
        await nftContract.connect(unlocker).unlock(randomTokenId);
        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(ADDRESS_ZERO);
      });

      it('owner can not transfer locked token', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
        
        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);

        await expect(
          nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId),
        ).to.be.revertedWith('Lockable: token is locked');
      });

      it('Unlocker can transfer locked token', async function () {
        let minted = (await nftContract.totalMinted());
        let startIndex = (await nftContract.nextTokenIndex()).sub(minted);
        let randomTokenId = startIndex.add(Math.floor(Math.random() * minted));
        
        //lock
        await nftContract.connect(holder).lock(await unlocker.getAddress(), randomTokenId);
        expect(await nftContract.getLocked(randomTokenId)).to.be.equal(await unlocker.getAddress());

        //unlock
        await nftContract.connect(unlocker).transferFrom(await holder.getAddress(), await random2.getAddress(), randomTokenId);
        expect(await nftContract.ownerOf(randomTokenId)).to.be.equal(await random2.getAddress()).and.not.to.be.equal(ADDRESS_ZERO);
      });
      
  });

});