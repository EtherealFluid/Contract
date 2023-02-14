const {ethers} = require("hardhat");
const {assert, expect} = require("chai");


describe("ICHOR", () => {
    beforeEach(async () => {
        //Get signers
        [owner, acc1, acc2, mockStaking, charity, projectWallet] = await ethers.getSigners();

        const name = "SactificeToken";
        const symbol = "ST";
        //Deploy token
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol);

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy(sacrifice.address);

        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, vFactory.address, staking.address, projectWallet.address);


        await staking.setIchorAddress(ichor.address);
        await vFactory.setIchorAddress(ichor.address);
        await sacrifice.setStakingAddress(staking.address);

    });
    
    describe("Tests", function () {
        it("Sould let stake", async () => {
            await ichor.transfer(acc1.address, "100000000000")
            await ichor.transfer(staking.address, "100000000000")
            console.log("Deployed", await ichor.balanceOf(owner.address))
            console.log("Deployed", await ichor.totalSupply())


        });

        
    });

    describe("Reverts", function () {
        it("Sould revert", async () => {

        });

    });
});