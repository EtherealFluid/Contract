
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { format } = require("prettier");
require('dotenv').config()
var {keccak256} = require("@ethersproject/keccak256");
var {toUtf8Bytes} = require("@ethersproject/strings");
const { ACC_PRIVATE_KEY } = process.env;


async function main() {
        /* //charity start address: 0xa94880A86c8c1bc8e5ee5F661c427E8B329b679a
        //Ichor deployer address for all ownership: 0xa94880A86c8c1bc8e5ee5F661c427E8B329b679a

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy("2592000");
        console.log("Staking address:",  staking.address)
        

        const VoterTx = await ethers.getContractFactory("Voter");
        voter = await VoterTx.deploy();
        console.log("Voter address:",  voter.address)

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy(voter.address);
        console.log("vFactory address:",  vFactory.address)

        const UnicornRewardsx = await ethers.getContractFactory("UnicornRewards");
        unicornRewards = await UnicornRewardsx.deploy();
        console.log("UnicornRewards address:",  unicornRewards.address)

        const UnicornTokenx = await ethers.getContractFactory("UnicornToken");
        unicornToken = await UnicornTokenx.deploy("Unicorn", "UT", vFactory.address, unicornRewards.address);
        console.log("UnicornToken address:",  unicornToken.address)

        uniswapV2Router = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"
        //oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const mockTX = await ethers.getContractFactory("mockERC20");
        const oldIchorAddress = await mockTX.deploy();
        console.log("oldIchorAddress address:",  oldIchorAddress.address)
        const charity = "0xa94880A86c8c1bc8e5ee5F661c427E8B329b679a"
        const migrationPayer = "0xa94880A86c8c1bc8e5ee5F661c427E8B329b679a"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress.address, charity, vFactory.address, staking.address, unicornRewards.address, migrationPayer);
        console.log("ICHOR address:",  ichor.address)

        const name = "SacrificeToken";
        const symbol = "ST";
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol, staking.address);
        console.log("Sacrifice address:",  sacrifice.address) */

        //settings

        const staking = await ethers.getContractAt("StakingContract", "0x773Ca7Bb9348C0c5FD52F93De9Fdc976f3Ee4881");
        const vFactory = await ethers.getContractAt("VotingFactory", "0xf87b5678EbDd17a8FeDB849dCC6A11FD58a49ed7");
        const unicornRewards = await ethers.getContractAt("UnicornRewards", "0x222C180D83beE589A0CC41f989DE189cf730E062");
        const unicornToken = await ethers.getContractAt("UnicornToken", "0x6e2F266b48e0206AdD560c40584B225aBE5137B3");
        const ichor = await ethers.getContractAt("ICHOR", "0x76939411024612B2856B1B97F741AeDE5BDc4E65");

        /* let votingType = 1
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = "0xa94880A86c8c1bc8e5ee5F661c427E8B329b679a"
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                
                const receipt = await transactionReceipt.wait()
                //console.log(receipt.logs)
                //console.log(receipt.events[0].args.instanceAddress.toString())

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
              
                let voting = await ethers.getContractAt("IVoting", votingInstance)
                console.log("inst", voting.address) */

                let votingInstance = "0x06dE39cC4DA58Ad9a3e7B7015d913BF372ac7C6F"
              
                let voter = await ethers.getContractAt("Voter", votingInstance)
                await voter.voteAgainst("0xF139fD0272A277B5bF0e61998584cfdd39066590", "1000")


/*         //Staking
        await staking.setIchorAddress(ichor.address);
        await staking.setSacrificeToken(sacrifice.address);

        //VotingFactory
        await vFactory.setIchorAddress(ichor.address);
        await vFactory.setUnicornToken(unicornToken.address);

        //UnicornRewards
        await unicornRewards.setIchorAddress(ichor.address);
        await unicornRewards.setUnicornToken(unicornToken.address); */

        //let owner = "0xa842a38CD758f8dE8537C5CBcB2006DB0250eC7C"
        //UnicornToken
        //await unicornToken.init("0xa94880A86c8c1bc8e5ee5F661c427E8B329b679a");


/*         const signer = new ethers.Wallet(ACC_PRIVATE_KEY, ethers.provider);
        await signer.sendTransaction({
          to: ichor.address,
          value: BigNumber.from("100000"),
        });
        
        await ichor.transfer(ichor.address, "500000")
        await ichor.openTrading()   */  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
