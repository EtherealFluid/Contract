
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
const { ACC_PRIVATE_KEY } = process.env;


async function main() {
        //charity start address: 0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6
        //Ichor deployer address for all ownership: 0x660D5035Ce4F1F50537bAA612bEb35855cD80F16

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy("2592000");

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const UnicornRewardsx = await ethers.getContractFactory("UnicornRewards");
        unicornRewards = await UnicornRewardsx.deploy();

        const UnicornTokenx = await ethers.getContractFactory("UnicornToken");
        unicornToken = await UnicornTokenx.deploy("Unicorn", "UT", vFactory.address, unicornRewards.address);

        uniswapV2Router = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
        //oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const mockTX = await ethers.getContractFactory("mockERC20");
        const oldIchorAddress = await mockTX.deploy();
        const charity = "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6"
        const migrationPayer = "0x660D5035Ce4F1F50537bAA612bEb35855cD80F16"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress.address, charity, vFactory.address, staking.address, unicornRewards.address, migrationPayer);

        const name = "SacrificeToken";
        const symbol = "ST";
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol, staking.address);

        //settings

        //Staking
        await staking.setIchorAddress(ichor.address);
        await staking.setSacrificeToken(sacrifice.address);

        //VotingFactory
        await vFactory.setIchorAddress(ichor.address);
        await vFactory.setUnicornToken(unicornToken.address);

        //UnicornRewards
        await unicornRewards.setIchorAddress(ichor.address);
        await unicornRewards.setUnicornToken(unicornToken.address);

        //let owner = "0xa842a38CD758f8dE8537C5CBcB2006DB0250eC7C"
        //UnicornToken
        await unicornToken.init("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16");


        const signer = new ethers.Wallet(ACC_PRIVATE_KEY, ethers.provider);
        await signer.sendTransaction({
          to: ichor.address,
          value: BigNumber.from("10000000000"),
        });
        
        await ichor.transfer(ichor.address, "476200233")
        await ichor.openTrading()


        console.log("Staking address:",  staking.address)
        console.log("vFactory address:",  vFactory.address)
        console.log("UnicornRewards address:",  unicornRewards.address)
        console.log("UnicornToken address:",  unicornToken.address)
        console.log("oldIchorAddress address:",  oldIchorAddress.address)
        console.log("ICHOR address:",  ichor.address)
        console.log("Sacrifice address:",  sacrifice.address)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
