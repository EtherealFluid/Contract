const {ethers} = require("hardhat");
const {assert, expect} = require("chai");


describe("SacrificeToken", () => {
    beforeEach(async () => {
        //Get signers
        [owner, acc1, acc2, mockStaking] = await ethers.getSigners();

        const name = "SactificeToken";
        const symbol = "ST";
        //Deploy token
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        token = await SacrificeTokenTx.deploy(name, symbol, mockStaking.address);

    });

    describe("Tests", function () {
        it("Sould get staking address", async () => {
            expect(await token.getStakintAddress()).to.be.equal(mockStaking.address);
        });

        it("Sould set staking address", async () => {
            await token.setStakintAddress(acc2.address);
            expect(await token.getStakintAddress()).to.be.equal(acc2.address);
        });

        it("Sould mint", async () => {
            expect(await token.balanceOf(acc1.address)).to.be.equal(0);
            await token.connect(mockStaking).mint(acc1.address, 100);
            expect(await token.balanceOf(acc1.address)).to.be.equal(100);
        });

        it("Sould burn", async () => {
            await token.connect(mockStaking).mint(acc1.address, 100);
            expect(await token.balanceOf(acc1.address)).to.be.equal(100);
            await token.connect(mockStaking).burn(acc1.address, 50);
            expect(await token.balanceOf(acc1.address)).to.be.equal(50);
        });
    });

    describe("Reverts", function () {
        it("Sould revert", async () => {

        });

    });
});