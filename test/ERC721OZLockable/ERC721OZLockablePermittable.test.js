// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployments, getNamedAccounts, ethers } = require('hardhat');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const toBN = ethers.BigNumber.from;

describe('ERC721 OZ Lockable Permittable TESTS', () => {
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

async function signPermit(spender, tokenId, nonce, deadline, signer) {
  //inspired by @dievardump's implementation
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

  beforeEach(async () => {
      [deployer, random, random2, unlocker, holder, spender, allowancesigner, operator] = await ethers.getSigners();

      delay = ms => new Promise(res => setTimeout(res, ms));

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
    *   ERC721 OZ PERMITS TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */

     describe('ERC721 OZ Permits tests', async function () {

      beforeEach(async () => {      
        let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
        let result = await txPrelMint.wait();
        globalStartIndex = result.events[0].args.tokenId;
        //console.log((await nftContract.totalSupply()).toString());
      });

      // Regular permits
      it('Permit issued by a holder for spender works', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        //console.log("tokenId: ", randomTokenId);;
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit 
            const signature = await signPermit(
                await spender.getAddress(),
                randomTokenId,
                await nftContract.nonces(randomTokenId),
                deadline,
                holder // who signs the permit
            );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);

            // use permit
            await nftContract
                .connect(spender)
                .permit(await holder.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature);

            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(await spender.getAddress());
      });

      it('Permit issued by a holder for spender works even if not spender uses it, but it still approves spender', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit 
            const signature = await signPermit(
                await spender.getAddress(),
                randomTokenId,
                await nftContract.nonces(randomTokenId),
                deadline,
                holder // who signs the permit
            );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);

            // use permit
            await nftContract
                .connect(random2)
                .permit(await holder.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature);

            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(await spender.getAddress());
      });

      
      it('Permit by a non holder does not work', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit 
            const signature = await signPermit(
              await spender.getAddress(),
              randomTokenId,
              await nftContract.nonces(randomTokenId),
              deadline,
              random // who signs the permit
          );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);
    
            await expect(
              nftContract
                .connect(spender)
                .permit(await random.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature),
            ).to.be.revertedWith('INVALID_SIGNER');
      });

      
      it('Mocking signer does not work', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit 
            const signature = await signPermit(
              await spender.getAddress(),
              randomTokenId,
              await nftContract.nonces(randomTokenId),
              deadline,
              random // who signs the permit
          );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);
    
            await expect(
              nftContract
                .connect(spender)
                .permit(await holder.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature),
            ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      
      it('Can not use permit issued for another address', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for locker but from non holder
            const signature = await signPermit(
                await spender.getAddress(),
                randomTokenId,
                await nftContract.nonces(randomTokenId),
                deadline,
                holder
            );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);
    
            await expect(
              nftContract
                .connect(random2)
                .permit(await holder.getAddress(), await random2.getAddress(), randomTokenId, deadline, signature),
            ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      it('Permit issued by an operator for spender works', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

        await nftContract.connect(holder).setApprovalForAll(await operator.getAddress(), true);

            // sign Permit 
            const signature = await signPermit(
                await spender.getAddress(),
                randomTokenId,
                await nftContract.nonces(randomTokenId),
                deadline,
                operator // who signs the permit
            );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);

            // use permit
            await nftContract
                .connect(spender)
                .permit(await operator.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature);

            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(await spender.getAddress());
      });

      it('Can not reuse permit', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for locker but from non holder
            const signature = await signPermit(
                await spender.getAddress(),
                randomTokenId,
                await nftContract.nonces(randomTokenId),
                deadline,
                holder
            );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);

            // use permit
            await nftContract
                .connect(spender)
                .permit(await holder.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature);

            // first time it works
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(await spender.getAddress());

            await expect(
              nftContract
                .connect(spender)
                .permit(await holder.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature),
            ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      it('Cannot use expired permit', async function () {
        let randomTokenId = globalStartIndex.add(Math.floor(Math.random() * 10));

        const activePeriod = 5;
        
        const deadline = parseInt(+new Date() / 1000) + activePeriod;  // + 60 seconds from now

            // sign Permit for locker but from non holder
            const signature = await signPermit(
                await spender.getAddress(),
                randomTokenId,
                await nftContract.nonces(randomTokenId),
                deadline,
                holder
            );

            // verify that token is not approved before permit is used
            expect(await nftContract.getApproved(randomTokenId)).to.be.equal(ADDRESS_ZERO);

            //wait
            //wait for almost a step and check price
            await delay((activePeriod + 1) * 1000);
            //mock tx to produce next block instantly
            await nftContract.connect(deployer).setBaseURI("https://mockURI.com/");

            await expect(
              nftContract
                .connect(spender)
                .permit(await holder.getAddress(), await spender.getAddress(), randomTokenId, deadline, signature),
            ).to.be.revertedWith('PERMIT_DEADLINE_EXPIRED');
      });

    });

    /*  ====== ====== ====== ====== ====== ======
   *   
   *   ERC721 A PERMIT FOR ALL TESTS
   * 
   * ====== ====== ====== ====== ======  ====== */

    describe('ERC721S PermitAll tests', async function () {

     beforeEach(async () => {      
       let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
       await txPrelMint.wait();
       //console.log((await nftContract.totalSupply()).toString());
     });
  
      // Permits for all
      it('PermitAll issued by a holder for operator works when operator uses it', async function () {
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

        //console.log(await nftContract.noncesForAll(await holder.getAddress(), await operator.getAddress()));

            // sign Permit for operator
            const signature = await signPermitAll(
                await operator.getAddress(),
                await nftContract.noncesForAll(await holder.getAddress(), await operator.getAddress()),
                deadline,
                holder
            );

            // verify that operator is not approved before permit is used
            expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.false;

            // use permit
            await nftContract
                .connect(operator)
                .permitAll(await holder.getAddress(), await operator.getAddress(), deadline, signature);

        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.true;
      });

      it('Mocking signer for permitAll does not work', async function () {

        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for operator but from non holder
            const signature = await signPermitAll(
                await operator.getAddress(),
                await nftContract.noncesForAll(await holder.getAddress(), await operator.getAddress()),
                deadline,
                random
            );
    
            await expect(
              nftContract
                .connect(operator)
                .permitAll(await holder.getAddress(), await operator.getAddress(), deadline, signature),
            ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      it('Cannot use permit issued for other person', async function () {

        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for operator but from non holder
            const signature = await signPermitAll(
                await operator.getAddress(),
                await nftContract.noncesForAll(await holder.getAddress(), await operator.getAddress()),
                deadline,
                random
            );
    
            await expect(
              nftContract
                .connect(random2)
                .permitAll(await holder.getAddress(), await random2.getAddress(), deadline, signature),
            ).to.be.revertedWith('INVALID_SIGNATURE');
      });

      it('Cannot reuse permitAll', async function () {
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

            // sign Permit for operator
            const signature = await signPermitAll(
                await operator.getAddress(),
                await nftContract.noncesForAll(await holder.getAddress(), await operator.getAddress()),
                deadline,
                holder
            );

            // verify that operator is not approved before permit is used
            expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.false;

            // use permit
            await nftContract
                .connect(operator)
                .permitAll(await holder.getAddress(), await operator.getAddress(), deadline, signature);

        expect(await nftContract.isApprovedForAll(await holder.getAddress(), await operator.getAddress())).to.be.true;

        await expect(
          nftContract
            .connect(operator)
            .permitAll(await holder.getAddress(), await operator.getAddress(), deadline, signature),
        ).to.be.revertedWith('INVALID_SIGNATURE');
      });
      
  });

});