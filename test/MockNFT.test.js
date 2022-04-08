// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployments, getNamedAccounts, ethers } = require('hardhat');

const toBN = ethers.BigNumber.from;

describe('Mock ERC721s NFT tests', () => {
  let deployer;
  let random;
  let random2;
  let unlocker;
  let holder;
  let locker;
  const ADDRESS_ZERO = ethers.constants.AddressZero;
  const mybase = "https://mybase.com/json/";

async function signPermitLock(locker, tokenId, nonce, deadline, signer) {
  const typedData = {
    types: {
        Permit: [
            { name: 'locker', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    },
    primaryType: 'Permit',
    domain: {
        name: "MockNFT",
        version: '1',
        chainId: chainId,
        verifyingContract: nftContract.address,
    },
    message: {
        locker,
        tokenId,
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

async function signPermit(spender, tokenId, nonce, deadline, signer) {
  const typedData = {
    types: {
        Permit: [
            { name: 'spender', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
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
        spender,
        tokenId,
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

async function signPermitAll(signer, spender, nonce, deadline, holder) {
  const typedData = {
      types: {
          PermitAll: [
              { name: 'signer', type: 'address' },
              { name: 'spender', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
          ],
      },
      primaryType: 'PermitAll',
      domain: {
          name: await nftContract.name(),
          version: '1',
          chainId: chainId,
          verifyingContract: nftContract.address,
      },
      message: {
          signer,
          spender,
          nonce,
          deadline,
      },
  };

  const signature = await holder._signTypedData(
      typedData.domain,
      { PermitAll: typedData.types.PermitAll },
      typedData.message,
  );

  return signature;
}


  beforeEach(async () => {
      [deployer, random, random2, unlocker, holder, locker] = await ethers.getSigners();

      // get chainId
      chainId = await ethers.provider.getNetwork().then((n) => n.chainId);

      const MockNFT = await ethers.getContractFactory('MockNFT', deployer);
      nftContract = await MockNFT.deploy(mybase);
  });

  describe('Deployment', async function () {
    it('deploys', async function () {
        expect(nftContract.address).to.not.equal("");
    });
    it('deploys with correct base URI', async function () {
      const mintQty = 3;
      await nftContract.connect(random).mint(await random.getAddress(), mintQty);
      expect(await nftContract.tokenURI(await nftContract.totalSupply() - 1)).to.include(mybase);
    });
    it('deploys with 0 tokens', async function () {
      expect(await nftContract.totalSupply()).to.equal(0);
    });
  });

    /*  ====== ====== ====== ====== ====== ======
    *   
    *   LOCKING AND UNLOCKING TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */

  describe('Locking and unlocking tests', async function () {
      it('Owner can lock his own token', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        await nftContract.connect(holder).lock(await unlocker.getAddress(), testedTokenId);

        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(await unlocker.getAddress());
      });

      it('Non Owner can not lock token', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;

        await expect(
          nftContract.connect(random).lock(await unlocker.getAddress(), testedTokenId),
        ).to.be.revertedWith('NOT_AUTHORIZED');
      });

      it('Non unlocker even holder can not unlock', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        await nftContract.connect(holder).lock(await unlocker.getAddress(), testedTokenId);

        await expect(
          nftContract.connect(holder).unlock(testedTokenId),
        ).to.be.revertedWith('NOT_UNLOCKER');
      });

      it('Unlocker can unlock', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        //lock
        await nftContract.connect(holder).lock(await unlocker.getAddress(), testedTokenId);
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(await unlocker.getAddress());

        //unlock
        await nftContract.connect(unlocker).unlock(testedTokenId);
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(ADDRESS_ZERO);
      });

      it('owner can not transfer locked token', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        await nftContract.connect(holder).lock(await unlocker.getAddress(), testedTokenId);

        await expect(
          nftContract.connect(holder).transferFrom(await holder.getAddress(), await random2.getAddress(), testedTokenId),
        ).to.be.revertedWith('LOCKED');
      });

      it('Unlocker can transfer locked token', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        //lock
        await nftContract.connect(holder).lock(await unlocker.getAddress(), testedTokenId);
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(await unlocker.getAddress());

        //unlock
        await nftContract.connect(unlocker).transferFrom(await holder.getAddress(), await random2.getAddress(), testedTokenId);
        expect(await nftContract.ownerOf(testedTokenId)).to.be.equal(await random2.getAddress()).and.not.to.be.equal(ADDRESS_ZERO);
      });

      it('Permit issued by a holder for a locker works when locker uses it', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for locker
        const signature = await signPermit(
          await locker.getAddress(),
          testedTokenId,
          await nftContract.lockingNonces(testedTokenId),
          deadline,
          holder
        );

        // verify that token is not locked before permit is used
        expect(await nftContract.getApproved(testedTokenId)).to.be.equal(ADDRESS_ZERO);

        // use permit
        await nftContract
          .connect(locker)
          .permit(await holder.getAddress(), await locker.getAddress(), testedTokenId, deadline, signature);

        expect(await nftContract.getApproved(testedTokenId)).to.be.equal(await locker.getAddress());
      });

      it('Permit All issued by a signer for a operator works when operator uses it', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60; 
        const signature = await signPermitAll(
          await holder.getAddress(),
          await locker.getAddress(),
          await nftContract.noncesForAll(await holder.getAddress(), await locker.getAddress()),
          deadline,
          holder
        );
        console.log(signature);
        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await locker.getAddress())).to.be.equal(false);

        await nftContract
          .connect(locker)
          .permitAll(await holder.getAddress(), await locker.getAddress(), deadline, signature);

          expect(await nftContract.isApprovedForAll(await holder.getAddress(), await locker.getAddress())).to.be.equal(true);
      });

      it('Mocking signer does not work for permitAll', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60; 
        const signature = await signPermitAll(
          await holder.getAddress(),
          await locker.getAddress(),
          await nftContract.noncesForAll(await holder.getAddress(), await locker.getAddress()),
          deadline,
          random
        );

        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await locker.getAddress())).to.be.equal(false);
    
        await expect(
          nftContract
            .connect(locker)
            .permitAll(await holder.getAddress(), await locker.getAddress(), deadline, signature),
        ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      it('Permit deadline expired', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        
        const deadline = parseInt(+new Date() / 1000); 
        const signature = await signPermitAll(
          await holder.getAddress(),
          await locker.getAddress(),
          await nftContract.noncesForAll(await holder.getAddress(), await locker.getAddress()),
          deadline,
          random
        );

        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await locker.getAddress())).to.be.equal(false);
    
        await expect(
          nftContract
            .connect(locker)
            .permitAll(await holder.getAddress(), await locker.getAddress(), deadline, signature),
        ).to.be.revertedWith('PERMIT_DEADLINE_EXPIRED');
      });

      it('Permit Lock issued by a holder for a locker works when locker uses it', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for locker
        const signature = await signPermitLock(
          await locker.getAddress(),
          testedTokenId,
          await nftContract.lockingNonces(testedTokenId),
          deadline,
          holder
        );

        // verify that token is not locked before permit is used
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(ADDRESS_ZERO);

        // use permit
        await nftContract
          .connect(locker)
          .permitLock(await holder.getAddress(), await locker.getAddress(), testedTokenId, deadline, signature, await unlocker.getAddress());

        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(await unlocker.getAddress());
      });

      it('Permit by a non holder does not work', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

        // sign Permit for locker but from non holder
        const signature = await signPermitLock(
          await locker.getAddress(),
          testedTokenId,
          await nftContract.lockingNonces(testedTokenId),
          deadline,
          random
        );

        // verify that token is not locked before permit is used
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(ADDRESS_ZERO);
    
        await expect(
          nftContract
           .connect(locker)
           .permitLock(await random.getAddress(), await locker.getAddress(), testedTokenId, deadline, signature, await unlocker.getAddress()),
        ).to.be.revertedWith('INVALID_SIGNER');
      });

      it('Mocking signer does not work for permit lock', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

        // sign Permit for locker but from non holder
        const signature = await signPermitLock(
          await locker.getAddress(),
          testedTokenId,
          await nftContract.lockingNonces(testedTokenId),
          deadline,
          random
        );

        // verify that token is not locked before permit is used
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(ADDRESS_ZERO);
    
        await expect(
          nftContract
            .connect(locker)
            .permitLock(await holder.getAddress(), await locker.getAddress(), testedTokenId, deadline, signature, await unlocker.getAddress()),
        ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      it('Can not use permit issued for another address', async function () {
        //mint token
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let testedTokenId = (await nftContract.totalSupply()) - 1;
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

        // sign Permit for locker but from non holder
        const signature = await signPermitLock(
          await locker.getAddress(),
          testedTokenId,
          await nftContract.lockingNonces(testedTokenId),
          deadline,
          holder
        );

        // verify that token is not locked before permit is used
        expect(await nftContract.getLocked(testedTokenId)).to.be.equal(ADDRESS_ZERO);
    
        await expect(
          nftContract
          .connect(random2)
          .permitLock(await holder.getAddress(), await locker.getAddress(), testedTokenId, deadline, signature, await unlocker.getAddress()),
        ).to.be.revertedWith('INVALID_LOCKER');
      });
  });
});