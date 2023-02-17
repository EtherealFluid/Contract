const {ethers} = require("hardhat");
const {assert, expect} = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


describe("SacrificeToken", () => {

    const increaseTime = async (time) => {
        await ethers.provider.send("evm_increaseTime", [time])
        await ethers.provider.send("evm_mine")
      }

    const getTimestump = async () => {
        let blockNumber = await ethers.provider.getBlockNumber()
        let block = await ethers.provider.getBlock(blockNumber)
        return block.timestamp
    }

    beforeEach(async () => {
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity] = await ethers.getSigners();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy("100");

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const UnicornRewardsx = await ethers.getContractFactory("UnicornRewards");
        unicornRewards = await UnicornRewardsx.deploy();

        const UnicornTokenx = await ethers.getContractFactory("UnicornToken");
        unicornToken = await UnicornTokenx.deploy("Unicorn", "UT", vFactory.address, unicornRewards.address);

        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, vFactory.address, staking.address, unicornRewards.address);

        const name = "SactificeToken";
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
        
        //UnicornToken
        await unicornToken.init(owner.address);
    });
    
    describe("Tests", function () {
        describe("Reverts", function () {
            it("Sould revert mint with SacrificeToken: caller is not a StakingContract!", async () => {
                await expect(sacrifice.connect(acc1).mint(acc1.address, 50)).to.be.revertedWith("SacrificeToken: caller is not a StakingContract!")
            });

            it("Sould revert burn with SacrificeToken: caller is not a StakingContract!", async () => {
                await expect(sacrifice.connect(acc1).burn(acc1.address, 50)).to.be.revertedWith("SacrificeToken: caller is not a StakingContract!")
            });
        })
    })
}) 