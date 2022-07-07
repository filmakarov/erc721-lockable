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

async function signAllowance(account, mintQty, allowanceId, signerAccount = allowancesigner) {
  const idBN = toBN(allowanceId).shl(128);
  const nonce = idBN.add(mintQty);
  const message = await minterContr.createMessage(account, nonce);

  //const formattedMessage = hexlify(toUtf8Bytes(message));
  const formattedMessage = hexlify(message);
  const addr = signerAccount.address.toLowerCase();

  const signature = await provider.send('eth_sign', [addr, formattedMessage]);

  return { nonce, signature };
}

  beforeEach(async () => {
      [deployer, random, random2, unlocker, holder, spender, allowancesigner, operator] = await ethers.getSigners();

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
    *   ERC721S PERMITS TESTS
    * 
    * ====== ====== ====== ====== ======  ====== */

     describe('ERC721S Permits tests', async function () {

      beforeEach(async () => {      
        let txPrelMint = await nftContract.connect(holder).mint(await holder.getAddress(), 10);
        await txPrelMint.wait();
        //console.log((await nftContract.totalSupply()).toString());
      });

      //
      // permits //
      //

      // Regular permits
      

      // Permits for all
      it('PermitAll issued by a holder for operator works when operator uses it', async function () {
        // allow minting for holder and mint token
        
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        
        const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;

        console.log(await nftContract.noncesForAll(await holder.getAddress(), await operator.getAddress()));

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

      it('Mocking signer does not work', async function () {
        await nftContract.connect(holder).mint(await holder.getAddress(), 3);
        let randomTokenId = (await nftContract.totalSupply()) - 1;
        
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
      
  });

});