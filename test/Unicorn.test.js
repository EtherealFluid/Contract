const {ethers} = require("hardhat");
const {assert, expect} = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


describe("ICHOR", () => {

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
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity, projectWallet, voting] = await ethers.getSigners();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy("100");

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const UnicornRewardsx = await ethers.getContractFactory("UnicornRewards");
        unicornRewards = await UnicornRewardsx.deploy();

        const UnicornTokenx = await ethers.getContractFactory("UnicornToken");
        unicornToken = await UnicornTokenx.deploy("Unicorn", "UT", voting.address, unicornRewards.address);

        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, voting.address, staking.address, unicornRewards.address, projectWallet.address);

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
    });
    
    async function settings() {
        await ichor.excludeFromFee(unicornRewards.address)

        await ichor.transfer(acc1.address, "10000000000000")
        await ichor.transfer(unicornRewards.address, "100000000000")
    }
    
    describe("Tests", function () {
        describe("Unicorn", function () {
            it("Should mint unicornStatus only once", async () => {
                expect(await unicornToken.getIsUnicorn(acc1.address)).to.be.false
                let expected = []
                expect((await unicornToken.getAllUnicorns()).toString()).to.be.equal(expected.toString())
                expect(await unicornToken.getUnicornsLength()).to.be.equal(0)
                
                await unicornToken.connect(voting).mint(acc1.address)
                await expect(unicornToken.connect(voting).mint(acc1.address)).to.be.revertedWith("UnicornToken: already Unicorn!")
                
                expect(await unicornToken.getIsUnicorn(acc1.address)).to.be.true
                expected = [acc1.address]
                expect((await unicornToken.getAllUnicorns()).toString()).to.be.equal(expected.toString())
                expect(await unicornToken.getUnicornsLength()).to.be.equal(1)
            });

            it("Should burn unicornStatus only once", async () => {
                expect(await unicornToken.getIsUnicorn(acc1.address)).to.be.false
                let expected = []
                expect((await unicornToken.getAllUnicorns()).toString()).to.be.equal(expected.toString())
                expect(await unicornToken.getUnicornsLength()).to.be.equal(0)
                
                await unicornToken.connect(voting).mint(acc1.address)
                
                expect(await unicornToken.getIsUnicorn(acc1.address)).to.be.true
                expected = [acc1.address]
                expect((await unicornToken.getAllUnicorns()).toString()).to.be.equal(expected.toString())
                expect(await unicornToken.getUnicornsLength()).to.be.equal(1)

                await unicornToken.connect(voting).burn(acc1.address)
                await expect(unicornToken.connect(voting).burn(acc1.address)).to.be.revertedWith("UnicornToken: user is not a Unicorn!")
                
                expect(await unicornToken.getIsUnicorn(acc1.address)).to.be.false
                expected = []
                expect((await unicornToken.getAllUnicorns()).toString()).to.be.equal(expected.toString())
                expect(await unicornToken.getUnicornsLength()).to.be.equal(0)
            });
        })

        describe("Reverts", function () {
            it("Should revert mint with UnicornToken: caller in not a Voting!", async () => {
                await expect(unicornToken.connect(acc2).mint(acc1.address)).to.be.revertedWith("UnicornToken: caller in not a Voting!")
            });
            
            it("Should revert burn with UnicornToken: caller in not a Voting!", async () => {
                await expect(unicornToken.connect(acc2).burn(acc1.address)).to.be.revertedWith("UnicornToken: caller in not a Voting!")
            });

            it("Should revert mint with UnicornToken: already Unicorn!", async () => {
                await unicornToken.connect(voting).mint(acc1.address)
                await expect(unicornToken.connect(voting).mint(acc1.address)).to.be.revertedWith("UnicornToken: already Unicorn!")
            });

            it("Should revert burn with UnicornToken: user is not a Unicorn!", async () => {
                await expect(unicornToken.connect(voting).burn(acc1.address)).to.be.revertedWith("UnicornToken: user is not a Unicorn!")
            });

            it("Should revert stake with StakingContract: caller is not a UnicornToken!", async () => {
                await expect(unicornRewards.connect(acc2).stake(acc1.address)).to.be.revertedWith("StakingContract: caller is not a UnicornToken!")
            });

            it("Should revert unstake with StakingContract: caller is not a UnicornToken!", async () => {
                await expect(unicornRewards.connect(acc2).unstake(acc1.address)).to.be.revertedWith("StakingContract: caller is not a UnicornToken!")
            });

            it("Should revert notifyRewardAmount with StakingContract: caller is not an Ichor!", async () => {
                await expect(unicornRewards.connect(acc2).notifyRewardAmount(100)).to.be.revertedWith("StakingContract: caller is not an Ichor!")
            });
        })

        describe("UnicornRewards", function () {
            it("Should distribute rewards to unicorns", async () => {
                await settings()

                await unicornToken.connect(voting).mint(acc1.address)
                await unicornToken.connect(voting).mint(acc2.address)

                let amount = "10000000000000"
                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)
                let usersAmount = 2

                let expectedFeeAmount = (amount  * 4) /100
                let expectedAmountToUnicorns = ((expectedFeeAmount * 50 / 100) * 15) / 100
            
                let expectedAmountToAcc1 = expectedAmountToUnicorns / usersAmount
                let expectedAmountToAcc2 = expectedAmountToUnicorns / usersAmount

                await ichor.connect(acc1).transfer(acc2.address, amount)

                await increaseTime(10)

                expect(await unicornRewards.earned(acc1.address)).to.be.equal(expectedAmountToAcc1)
                expect(await unicornRewards.earned(acc2.address)).to.be.equal(expectedAmountToAcc2)
            });

            it("Should let claim distributed rewards to unicorns", async () => {
                await settings()

                await unicornToken.connect(voting).mint(acc1.address)
                await unicornToken.connect(voting).mint(acc2.address)

                let amount = "10000000000000"
                
                let usersAmount = 2

                let expectedFeeAmount = (amount  * 4) /100
                let expectedAmountToUnicorns = ((expectedFeeAmount * 50 / 100) * 15) / 100
            
                let expectedAmountToAcc1 = expectedAmountToUnicorns / usersAmount
                let expectedAmountToAcc2 = expectedAmountToUnicorns / usersAmount

                await ichor.connect(acc1).transfer(acc2.address, amount)

                await increaseTime(10)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                expect(await unicornRewards.earned(acc1.address)).to.be.equal(expectedAmountToAcc1)
                expect(await unicornRewards.earned(acc2.address)).to.be.equal(expectedAmountToAcc2)

                await unicornRewards.connect(acc1).getReward()
                await unicornRewards.connect(acc2).getReward()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(Number(expectedAmountToAcc1) + Number(balanceBeforeAcc1))
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(Number(expectedAmountToAcc2) + Number(balanceBeforeAcc2))
            });

            it("Should claim 0 distributed rewards", async () => {
                await settings()

                await unicornToken.connect(voting).mint(acc1.address)
                await unicornToken.connect(voting).mint(acc2.address)

                await increaseTime(10)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                await unicornRewards.connect(acc1).getReward()
                await unicornRewards.connect(acc2).getReward()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(balanceBeforeAcc1)
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(balanceBeforeAcc2)
            });

            //TODO
            it("Should distribute unequal rewards", async () => {
                await settings()

                await unicornToken.connect(voting).mint(acc1.address)
                await unicornToken.connect(voting).mint(acc2.address)

                await increaseTime(10)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                await unicornRewards.connect(acc1).getReward()
                await unicornRewards.connect(acc2).getReward()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(balanceBeforeAcc1)
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(balanceBeforeAcc2)
            });

        })
    })
})