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
        //Get signers
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity, projectWallet] = await ethers.getSigners();

        const name = "SactificeToken";
        const symbol = "ST";
        //Deploy token
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol);

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy(sacrifice.address, "100");

        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, vFactory.address, staking.address, projectWallet.address);


        await staking.setIchorAddress(ichor.address);
        await vFactory.setIchorAddress(ichor.address);
        await sacrifice.setStakingAddress(staking.address);

        await ichor.excludeFromFee(staking.address)

        await ichor.transfer(acc1.address, "100000000000")
        await ichor.transfer(acc2.address, "100000000000")
        await ichor.transfer(staking.address, "100000000000")

        await ichor.connect(acc1).approve(staking.address, "100000000000")
        await ichor.connect(acc2).approve(staking.address, "100000000000")

    });
    
    describe("Tests", function () {
        describe("StakingContract", function () {
/*             async function settings() {
                await ichor.excludeFromFee(staking.address)

                await ichor.transfer(acc1.address, "100000000000")
                await ichor.transfer(acc2.address, "100000000000")
                await ichor.transfer(staking.address, "100000000000")

                await ichor.connect(acc1).approve(staking.address, "100000000000")
                await ichor.connect(acc2).approve(staking.address, "100000000000")
                //return {};
            } */

            it("Sould getIchorAddress", async () => {
                expect(await staking.getIchorAddress()).to.be.equal(ichor.address)
            });

            it("Sould let setMinimalStakingPeriod", async () => {
                await staking.connect(acc1).stake("600")
                expect(await staking.getTimeStakeEnds(acc1.address)).to.be.equal(await getTimestump() + 100)

                await staking.setMinimalStakingPeriod("1000")
 
                await staking.connect(acc2).stake("400")
                 
                expect(await staking.getTimeStakeEnds(acc2.address)).to.be.equal(await getTimestump() + 1000)

                await increaseTime(200)
                await staking.connect(acc1).getReward()
                await expect(staking.connect(acc2).getReward()).to.be.revertedWith("StakingContract: period not ended!")
            });

            it("Sould let stake", async () => {
                //await loadFixture(settings);
                
                await staking.connect(acc1).stake("600")
                expect(await staking.getTimeStakeEnds(acc1.address)).to.be.equal(await getTimestump() + 100)
                expect(await sacrifice.totalSupply()).to.be.equal("600")
                expect(await sacrifice.balanceOf(acc1.address)).to.be.equal("600")
                expect(await staking.getStakedAmount(acc1.address)).to.be.equal("600")
                expect(await ichor.balanceOf(staking.address)).to.be.equal("100000000600")

                await staking.connect(acc2).stake("400")
                
                expect(await staking.getTimeStakeEnds(acc2.address)).to.be.equal(await getTimestump() + 100)
                expect(await sacrifice.totalSupply()).to.be.equal("1000")
                expect(await sacrifice.balanceOf(acc2.address)).to.be.equal("400")
                expect(await staking.getStakedAmount(acc2.address)).to.be.equal("400")
                expect(await ichor.balanceOf(staking.address)).to.be.equal("100000001000")

                await increaseTime(200)

                expect(await staking.earned(acc1.address)).to.be.equal(0)
                expect(await staking.earned(acc2.address)).to.be.equal(0)
            });

            it("Sould let stake and earn distributions", async () => {
                //await loadFixture(settings);

                let amountToStakeAcc1 = 600
                let amountToStakeAcc2 = 400
        
                await staking.connect(acc1).stake(amountToStakeAcc1)
                await staking.connect(acc2).stake(amountToStakeAcc2)

                await ichor.includeInFee(acc1.address)
                await ichor.includeInFee(acc2.address)

                const amount = 1000000000;
                await ichor.connect(acc1).transfer(acc2.address, amount)

                let expectedFeeAmount = (amount * 4) /100
                let expectedAmountToStaking = ((expectedFeeAmount * 50 / 100) * 85) / 100
                let acc1PartOfTotalStaked = amountToStakeAcc1 * 100 / (amountToStakeAcc1 + amountToStakeAcc2)
                let expectedAmountToAcc1 = expectedAmountToStaking * acc1PartOfTotalStaked / 100
                let expectedAmountToAcc2 = expectedAmountToStaking - expectedAmountToAcc1


                await increaseTime(1000)
                
                expect(await staking.earned(acc1.address)).to.be.equal(expectedAmountToAcc1)
                expect(await staking.earned(acc2.address)).to.be.equal(expectedAmountToAcc2)
            });

            it("Sould let stake, earn and getRewards", async () => {
                //await loadFixture(settings);

                let amountToStakeAcc1 = 600
                let amountToStakeAcc2 = 400
        
                await staking.connect(acc1).stake(amountToStakeAcc1)
                await staking.connect(acc2).stake(amountToStakeAcc2)

                await ichor.includeInFee(acc1.address)
                await ichor.includeInFee(acc2.address)

                const amount = 1000000000;
                await ichor.connect(acc1).transfer(acc2.address, amount)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                

                let expectedFeeAmount = (amount * 4) /100
                let expectedAmountToStaking = ((expectedFeeAmount * 50 / 100) * 85) / 100
                let acc1PartOfTotalStaked = amountToStakeAcc1 * 100 / (amountToStakeAcc1 + amountToStakeAcc2)
                let expectedAmountToAcc1 = expectedAmountToStaking * acc1PartOfTotalStaked / 100
                let expectedAmountToAcc2 = expectedAmountToStaking - expectedAmountToAcc1


                await increaseTime(1000)
                
                expect(await staking.earned(acc1.address)).to.be.equal(expectedAmountToAcc1)
                expect(await staking.earned(acc2.address)).to.be.equal(expectedAmountToAcc2)

                await staking.connect(acc1).getReward()
                await staking.connect(acc2).getReward()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(expectedAmountToAcc1 + Number(balanceBeforeAcc1))
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(expectedAmountToAcc2 + Number(balanceBeforeAcc2))
            });

            it("Sould let unstake", async () => {
                //await loadFixture(settings);

                let stakingBalance = await ichor.balanceOf(staking.address)

                let amountToStakeAcc1 = 600
                let amountToStakeAcc2 = 400
        
                await staking.connect(acc1).stake(amountToStakeAcc1)
                await staking.connect(acc2).stake(amountToStakeAcc2)

                await ichor.includeInFee(acc1.address)
                await ichor.includeInFee(acc2.address)

                const amount = 1000000000;
                await ichor.connect(acc1).transfer(acc2.address, amount)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                let expectedFeeAmount = (amount * 4) /100
                let expectedAmountToStaking = ((expectedFeeAmount * 50 / 100) * 85) / 100
                let acc1PartOfTotalStaked = amountToStakeAcc1 * 100 / (amountToStakeAcc1 + amountToStakeAcc2)
                let expectedAmountToAcc1 = expectedAmountToStaking * acc1PartOfTotalStaked / 100
                let expectedAmountToAcc2 = expectedAmountToStaking - expectedAmountToAcc1


                await increaseTime(1000)
                
                expect(await staking.earned(acc1.address)).to.be.equal(expectedAmountToAcc1)
                expect(await staking.earned(acc2.address)).to.be.equal(expectedAmountToAcc2)

                await staking.connect(acc1).unstake()
                await staking.connect(acc2).unstake()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(expectedAmountToAcc1 + Number(balanceBeforeAcc1) + Number(amountToStakeAcc1))
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(expectedAmountToAcc2 + Number(balanceBeforeAcc2) + Number(amountToStakeAcc2))

                expect(await ichor.balanceOf(staking.address)).to.be.equal(stakingBalance)
            });

            it("Should penilize early withdrawal", async () => {
                //await loadFixture(settings);

                let stakingBalance = await ichor.balanceOf(staking.address)

                let amountToStakeAcc1 = 600
                let amountToStakeAcc2 = 400
        
                await staking.connect(acc1).stake(amountToStakeAcc1)
                await staking.connect(acc2).stake(amountToStakeAcc2)

                await ichor.includeInFee(acc1.address)
                await ichor.includeInFee(acc2.address)

                const amount = 1000000000;
                await ichor.connect(acc1).transfer(acc2.address, amount)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                let expectedFeeAmount = (amount * 4) /100
                let expectedAmountToStaking = ((expectedFeeAmount * 50 / 100) * 85) / 100
                let acc1PartOfTotalStaked = amountToStakeAcc1 * 100 / (amountToStakeAcc1 + amountToStakeAcc2)
                let expectedAmountToAcc1 = expectedAmountToStaking * acc1PartOfTotalStaked / 100
                let expectedAmountToAcc2 = expectedAmountToStaking - expectedAmountToAcc1 + (expectedAmountToAcc1 * 15 / 100)
                expectedAmountToAcc1 = expectedAmountToAcc1 - (expectedAmountToAcc1 * 15 / 100)

                await staking.connect(acc1).unstake()

                await increaseTime(1000)

                await staking.connect(acc2).unstake()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(expectedAmountToAcc1 + Number(balanceBeforeAcc1) + Number(amountToStakeAcc1))
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(expectedAmountToAcc2 + Number(balanceBeforeAcc2) + Number(amountToStakeAcc2))

                expect(await ichor.balanceOf(staking.address)).to.be.equal(stakingBalance)
            });

            it("Should let transfer stake", async () => {
                //await loadFixture(settings);

                let stakingBalance = await ichor.balanceOf(staking.address)

                let amountToStakeAcc1 = 600
                let amountToStakeAcc2 = 400
        
                await staking.connect(acc1).stake(amountToStakeAcc1)
                await staking.connect(acc2).stake(amountToStakeAcc2)

                await ichor.includeInFee(acc1.address)
                await ichor.includeInFee(acc2.address)

                const amount = 1000000000;
                await ichor.connect(acc1).transfer(acc2.address, amount)

                let balanceBeforeAcc1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeAcc2 = await ichor.balanceOf(acc2.address)

                let expectedFeeAmount = (amount * 4) /100
                let expectedAmountToStaking = ((expectedFeeAmount * 50 / 100) * 85) / 100
                let acc1PartOfTotalStaked = amountToStakeAcc1 * 100 / (amountToStakeAcc1 + amountToStakeAcc2)
                let expectedAmountToAcc1 = expectedAmountToStaking * acc1PartOfTotalStaked / 100
                let expectedAmountToAcc2 = expectedAmountToStaking - expectedAmountToAcc1 + (expectedAmountToAcc1 * 15 / 100)
                expectedAmountToAcc1 = expectedAmountToAcc1 - (expectedAmountToAcc1 * 15 / 100)


                await increaseTime(1000)

                await sacrifice.connect(acc1).transfer(acc2.address, "600")

                await expect(staking.connect(acc1).unstake()).to.be.revertedWith("StakingContract: no tokens staked!")
                await staking.connect(acc2).unstake()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(Number(balanceBeforeAcc1))
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(expectedAmountToAcc1 + expectedAmountToAcc2 + Number(balanceBeforeAcc2) + Number(amountToStakeAcc2) + Number(amountToStakeAcc1))

                expect(await ichor.balanceOf(staking.address)).to.be.equal(stakingBalance)
            });

            /* xit("Should claim multiply distributions", async () => {
                

            }); */

        });
        

        
    });

    describe("Reverts", function () {
        it("Sould revert notifyRewardAmount with StakingContract: caller is not THIS or ICHOR token!", async () => {
            await expect(staking.connect(owner).notifyRewardAmount(100)).to.be.revertedWith("StakingContract: caller is not THIS or ICHOR token!")
        });

        it("Sould revert getReward with StakingContract: period not ended!", async () => {
            await staking.connect(acc1).stake(100)

            await ichor.includeInFee(acc1.address)
            await ichor.includeInFee(acc2.address)
            await ichor.connect(acc1).transfer(acc2.address, "1000000")

            await expect(staking.connect(acc1).getReward()).to.be.revertedWith("StakingContract: period not ended!")
        });

        it("Sould revert setIchorAddress with Ownable: caller is not the owner", async () => {
            await expect(staking.connect(acc1).setIchorAddress(acc2.address)).to.be.revertedWith("Ownable: caller is not the owner")
        });

        it("Sould revert setMinimalStakingPeriod with Ownable: caller is not the owner", async () => {
            await expect(staking.connect(acc1).setMinimalStakingPeriod(1)).to.be.revertedWith("Ownable: caller is not the owner")
        });

        it("Sould revert stake with StakingContract: tokens already staked!", async () => {
            await staking.connect(acc1).stake(100)
            await expect(staking.connect(acc1).stake(50)).to.be.revertedWith("StakingContract: tokens already staked!")
        });

        it("Sould revert stake with StakingContract: amount is 0!", async () => {
            await expect(staking.connect(acc1).stake(0)).to.be.revertedWith("StakingContract: amount is 0!")
        });

        it("Sould revert unstake with StakingContract: no tokens staked!", async () => {
            await expect(staking.connect(acc1).unstake()).to.be.revertedWith("StakingContract: no tokens staked!")
        });

        it("Sould revert unstake with StakingContract: no tokens staked!", async () => {
            await expect(staking.connect(acc1).unstake()).to.be.revertedWith("StakingContract: no tokens staked!")
        });

    });
});