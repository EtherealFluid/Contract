# Ichor-voter Smart-Contracts

The Ichor-voter platform (also known as the Immortal protocol) is a Decentralized Autonomous Organization that implements the functionality of creating and participating in votings. 

Its main purpose is to provide the charity donations to different organizations which are selected by the community members via the vote process.

#### Table on contents

[Prereqiusites](#preqs)
[Build](#build)
[Test](#test)
[Run scripts](#run)
[Deploy](#deploy)
[Networks](#networks)
[Wallets](#wallets)
[Smart Contract Logic](#logic)
[-- ICHOR](#ICHOR)
[-- StakingContract](#Staking)
[-- SacrificeToken](#Sacrifice)
[-- VotingFactory](#VotingFactory)
[-- Voting](#Voting)
[-- UnicornToken](#UnicornToken)
[-- UnicornRewards](#UnicornRewards)

<a name="preqs"/>

### Prerequisites

- Install [Git](https://git-scm.com/)
- Install [Node.js](https://nodejs.org/en/download/)
- Clone this repository with `git clone https://git.sfxdx.com/ichor-voter/ichor-voter-sc.git`
- Navigate to the directory with the cloned code
- Install [Hardhat](https://hardhat.org/) with `npm install --save-dev hardhat`
- Install all required dependencies with `npm install`
- Create a file called `.env` in the root of the project with the same contents as `.env.example`
- Create an account on [Etherscan](https://etherscan.io/). Go to `Account -> API Keys`. Create a new API key. Copy it to `.env` file
  ```
  POLYGONSCAN_API_KEY=***API KEY***
  ```
- Copy your wallet's private key (see [Wallets](#wallets)) to `.env` file

  ```
  ACC_PRIVATE_KEY=***ACCOUNT PRIVATE KEY***
  ```

  :warning:**DO NOT SHARE YOUR .env FILE IN ANY WAY OR YOU RISK TO LOSE ALL YOUR FUNDS**:warning:

<a name="build"/>
### Build

```
npx hardhat compile
```

<a name="test"/>
### Test

```
npx hardhat test
```

<a name="run"/>
### Run Scripts

```
npx hardhat run *script file name here* --network *network name here*
```

<a name="deploy"/>
### Deploy

```
npx hardhat run scripts/deploy.js --network *network name here*
```

After contracts are deployed, you can find their _addresses_ in the console.
All deployed contracts **must be verified** manually.

<a name="networks"/>
### Networks

а) ** Ethereum test** network
Make sure you have _enough Goerli test tokens_ for testnet.

```
*hardhat command here* --network testnet
```

b) **Hardhat** network

- Run Hardhat node locally. All _deploy scripts_ will be executed as well:

```
npx hardhat node
```

- Run sripts on the node

```
npx hardhat run *script name here* --network localhost
```

<a name="wallets"/>

### Wallets

For deployment you will need to use either _your existing wallet_.

#### Using an existing wallet

You would need to be able to export (copy/paste) its private key. For example, you can export private key from your MetaMask wallet.
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

<a name="logic"/>

### Smart Contract Logic

---

**Roles**:

- admin: controls setters.
- user: buys ICHOR token, stakes, votes.

<a name="ICHOR"/>

#### ICHOR.sol

This is an [ERC20](https://docs.openzeppelin.com/contracts/4.x/erc20) token with reflection mechanism.
It can be:

- transferred between addresses.
- staked by token holder.
- used to participate in votings.

Owner can:

- open trading (create pool on swap and add liquidity).
- manual swap ICHOR tokens on ICHOR contract balance for eth.
- withdraw ETH from contract balance.
- add and delete bot address.
- exclude or include address from paying fee.
- set max buy tokens amount, max sell tokens amount and max tokens per wallet amount.
- enable or disable cooldown.

<a name="Staking"/>

#### StakingContract.sol

This is an staking contract. Stakers are rewarded from commissions from transfers of ichor tokens
Holders can:

- stake tokens.
- unstake tokens.
- claim rewards.

Owner can:
- set SacrificeToken address.

<a name="Sacrifice"/>

#### SacrificeToken.sol

This is an [ERC20](https://docs.openzeppelin.com/contracts/4.x/erc20) token. Can be minted/burned only by staking contract. It mints 1 to 1 in exchange for staked ichor tokens. You can transfer tokens, but only after the staking period ends. 
It can be:

- transferred, but along with the right to stake back ichor tokens for the amount transferred.

<a name="VotingFactory"/>

#### VotingFactory.sol

This is a factory for Votings. Only unicorns can create Votings.
Unicorns can:

- create new Voting.

Owner can:

- set ICHOR token address.
- set Unicorn token address.

<a name="Voting"/>

#### Voting.sol

Voting instance. Can be created by Unicorns in VotingFactory. ICHOR token holders can vote by locking their ICHOR tokens on Voting contract balance. The voting weight is determined by the number of locked tokens 1 to 1. The user can only vote for one option, but can lock an additional amount of tokens in the already selected option.
Holders can:

- vote FOR or vote AGAINST.
- withdraw locked tokens after voting ends.

Anyone can:

- finish voting and complete result after voting ends.
- get voting results after voting ends.

<a name="UnicornToken"/>

#### UnicornToken.sol

SoulBound token that granting Unicorn status. Can't be transfered. Minted only by Voting results. Unicorns recieve rewards by transfer fee distribution.
No one can interact with the token directly.

<a name="UnicornRewards"/>

#### UnicornRewards.sol

Contract for Unicorn's transfer fee distribution.
Unicorns can:

- withdraw rewards.

Owner can: 

- set Unicorn token address.
- set ICHOR token address.


#### Test cases

1) After the transfer of the token, the reward must be distributed in accordance with the RQ. (***transfer*** method)
 - Current charity address: 0xa842a38CD758f8dE8537C5CBcB2006DB0250eC7C
 - First Unicorn token holder: 0xa842a38CD758f8dE8537C5CBcB2006DB0250eC7C
 - No tokens staked for now.

2) You can stake ICHOR tokens to recieve Sacrifice Tokens and earning rewards. (***stake*** method)

3) You can check earned ICHOR tokens in Staking contract. (***earned*** method)

4) You can mint yourself a mockERC20 tokens (0x4955F4E026CdB8614eBec6175A8049E87d323373, ***mint*** method) and migrate tokens in ICHOR yoken contract (***migrateTokens*** method)
