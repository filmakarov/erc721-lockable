# LOCKABLE NFTs (Formerly ERC721S)
Extension to the `ERC721` standard, that introduces lockable NFTs. The locked asset can be used in any way except selling/transferring it.

## Abstract
NFTs took the world by storm. It's probably because non-fungibility as a concept is much easier to intuitively understand, than fungibility, as our world is mostly non-fungible.

With NFTs, digital objects become digital goods. Verifiably ownable, easily tradable, immutably stored on the blockchain.
However, the usability of NFT presently is quite limited. 
Existing use cases often have poor UX as they are inherited from `ERC20` (fungible tokens) world.

In DeFi you mostly deal with `ERC20` tokens. There is a UX pattern when you lock your tokens on a service smart contract.
For example, if you want to borrow some $DAI, you have to provide some $ETH as collateral for a loan. During the loan period $ETH is being locked into the lending service contract. And it's ok for $ETH and other fungible tokens. 

It's different for NFTs. NFTs have plenty of use cases, that require for the NFT to stay on the holder's wallet even when it is used as collateral for a loan.
You may want to keep using your NFT as a verified PFP on Twitter. You may want to use it to authorize on Discord server through Collab.land. You may want to use your NFT in a P2E game. And you should be able to do all of this even during the lending period like you are able to live in your house even it is mortgaged.


## Motivation
The initial idea was to just make NFTs that will feature better UX used as collateral.
But then it became obvious, that one single locking feature allows for plenty of other use cases, such as lending/borrowing NFT without a need for collateral, paying for NFT by installments, safe and convenient usage with hot wallets, non-custodial staking and much more.
Every use case can (and some of them [are](https://github.com/mattdf/ERC721Loanable) already) be implemented one at a time.
Our aim however was to come up with a standardized implementation.

This approach proposes a solution that is designed to be as minimal as possible. At the same time, it is a generalized implementation, that allows for a lot of extensibility and potential use cases.
It only allows to lock the item (stating who will be able to unlock it) and unlock it when needed.

## Specification
Here are the functions that allow locking.
```    
    mapping(uint256 => address) internal unlockers
    function getLocked(uint256 tokenId) public virtual view returns (address)
    function _lock(address unlocker, uint256 id) internal virtual
    function _unlock(uint256 id) internal virtual
    function lock(address unlocker, uint256 id) public
    function unlock(uint256 id) public
```
`unlockers` mapping serves to store the unlocker's addresses for the locked tokens. When there is zero address as value for the given key (tokenId), that means this token is not locked.

`unlockers` function returns the unlocker for this tokenId

Both `_lock` and `_unlock` internal functions, which are implemented in the standard `ERC721s.sol` itself, do not perform any check on who can actually lock and unlock. They just do the job required. 

Public `lock` function allows locking by the holder and approved parties. 
Initially, it was supposed, that some projects can limit it to only holder, so the public function for the locking was not included in the standard itself. It turned out, that in most cases, using this contract with marketplaces requres for the standardized public interface for locking and also requires for the locking to be available for approved parties. So the implementation been included in the contract.

The public `unlock` implementation provided allows for unlocking only by the unlocker stated in the `getLocked` mapping. 

Also, the locking extension overrides hooks and function from `ERC721` to ensure locking safety.

All the locks are removed when the token is being transferred.

## Rationale (Usecases)
- **NFT-collateralised loans** Use your NFT as collateral for a loan without locking it on the lending protocol contract. Lock it on your wallet instead and continue enjoying all the utility of your NFT.
- **No collateral rentals of NFTs** Borrow NFT for a fee, without a need for huge collateral. You can use NFT, but not transfer it, so the lender is safe. The borrowing service contract automatically transfers NFT back to the lender as soon as the borrowing period expires.
- **Primary sales** Mint NFT for only the part of the price and pay the rest when you are satisfied with how the collection evolves.
- **Secondary sales** Buy and sell your NFT by installments. Buyer gets locked NFT and immediately starts using it. At the same time he/she is not able to sell the NFT until all the installments are paid. If full payment is not received, NFT goes back to the seller together with a fee.
- **S is for Safety** Use your exclusive blue chip NFTs safely and conveniently. The most convenient way to use NFT is together with MetaMask. However, MetaMask is vulnerable to various bugs and attacks. With `Lockable` extension you can lock your NFT and declare your safe cold wallet as an unlocker. Thus, you can still keep your NFT on MetaMask and use it conveniently. Even if a hacker gets access to your MetaMask, they won’t be able to transfer your NFT without access to the cold wallet. That’s what makes `Lockable` NFTs safe. This use case is also [described](https://github.com/OwlOfMoistness/erc721-lock-registry) by OwlOfMoistness.
- **Metaverse ready** Locking NFT tickets can be useful during huge Metaverse events. That will prevent users, who already logged in with an NFT, from selling it or transferring it to another user. Thus we avoid double usage of one ticket.
- **Non-custodial staking** Using locking of NFTs for the staking protocols that do not transfer your NFT from your wallet to the staking contract is thoroughly described [here](https://github.com/OwlOfMoistness/erc721-lock-registry) and [here](https://github.com/samurisenft/erc721nes-contracts). However, my approach to this is a little bit different. I think staking should be done in one place only like you can not deposit money in two bank accounts simultaneously. 
Another approach to the same concept is using locking to provide proof of HODL. You can lock your NFTs from selling as a manifestation of loyalty to the community and start earning rewards for that. It is better version of the rewards mechanism, that was originally introduced by [The Hashmasks](https://www.thehashmasks.com/nct) and their $NCT token. 
- **Safe and convenient co-ownership and co-usage** Extension of safe co-ownership and co-usage. For example, you want to purchase an expensive NFT asset together with friends, but it is not handy to use it with multisig, so you can safely rotate and use it between wallets. The NFT will be stored on one of the co-owners' wallet and he will be able to use it in any way (except transfers) without requiring multi-approval. Transfers will require multi-approval.

I'm sure that there will be more of use cases introduced as soon as the community starts to explore `Lockable` NFTs.

## Backwards Compatibility
A great number of legacy collections have been launched before `Lockable` extension. So, there is obviously a need for a backward compatibility solution to allow holders of existing blue-chip collections to enjoy services based on `Lockable` locking feature.
Our approach is that such a solution should be based on the concept of Wrapping.
Blue-chip collection admins set up a wrapping contract (that aside from locking can implement permits for gasless listings or on-chain royalties) and manage it, so the source of trust for holders does not change.

## Reference Implementations
Any implementation of the original `ERC721` standard can be used with `Lockable` extension.
In this repo there are three extension implementations: for the standard `ERC721` by OpenZeppelin, for the `ERC721A` by Chiru Labs, and for `ERC721S`, that is my own custom `ERC721` implementaation.

`ERC721SLockablePermittable.sol` and `ERC721OZLockablePermittable.sol` are the extended implementations that feature `EIP26212`-like signature verification for the "approval" and "approval for all" procedures. The usage of `EIP26212`-like permits allows for better UX when used with actual service contracts and is highly recommended.

`mocks` folder contain the mock implementations of the `Lockable` NFT smart contracts for different `ERC721` implementations. Used for tests and can be used as reference.

`MockLockerContract.sol` contains reference implementation of different flows to lock and unlock NFTs by the service smart-contracts, like Rentals service smart-contract.

## Security Considerations
As soon as the standard only introduces locking, there are a few things to be considered security-wise.
One of them is to always consider if there's a required unlocking function in the contract, that is suggested to be stated as unlocker. Otherwise affected NFT can stay locked from transfers forever.

Another issue, that is common to all the implementation of locked NFTs concept is that despite the locked NFTs can not be transferred, nothing prevents a holder from listing it on OpenSea or another marketplace.
That can cause bad UX when the NFT is listed, but it is not possible to actually buy it, as NFT is locked from being transferred.
That however can be solved in two ways:
1. Before marketplaces adopt locked NFTs standard, every project can just update metadata and/or media depending on whether is the token locked or not.
2. Later on, when there will be many projects implementing `Lockable` NFTs, it will be easy for marketplaces to check if the token is locked or not by just calling the public `getLocked` function. If the token is locked, the "Purchase" button can be deactivated and/or the Lock icon can be shown next to such an asset. 

In the service smart-contracts, that works with `Lockable` NFTs, `transferFrom` should always be used instead of `safeTransferFrom` to avoid reentrancy attacks.

Extended implementations can have their own security considerations.
For example, `Permittable` implementations provided in this repo, feature `EIP2612`-like permit-based locking functionality.
So it inherits all the [security considerations](https://eips.ethereum.org/EIPS/eip-2612#security-considerations) from `EIP-2612`. 

## Other implementations of lockable NFTs

### ERC721LockRegistry Contract by OwlOfMoistness
[ERC721LockRegistry](https://github.com/OwlOfMoistness/erc721-lock-registry) allows contracts that implement the `ILock` interface to lock/unlock assets in place to enable/disable them from being transferred. This implementation allows multiple locks being put on the same asset, so the very same NFT can be used in multiple services simultaneously still living on a holder's wallet.

### ERC-721 NES by SamuRise
[ERC-721 NES](https://github.com/samurisenft/erc721nes-contracts) by SamuRise NFT collection team. 
NES stands for Non Escrow Staking. It is a novel implementation of a staking model that does not require the owner of a token to lock it into an escrow contract. ERC-721 NES provides an interface to staking protocols.

### Loanable NFTs by Mattdf
[Loanable NFTs](https://github.com/mattdf/ERC721Loanable) repo contains an extension to the `ERC721` token standard that allows the deployment of NFTs that users can loan out risk-free in exchange for an up-front premium. It uses the idea of locking an NFT during the loan period.
