const { expectEvent, BN, time, expectRevert } = require('@openzeppelin/test-helpers')
const { assert, expect } = require('chai')

const RPTToken = artifacts.require('RPVToken')
const RPVToken = artifacts.require('RPTToken')
const voting = artifacts.require('Voting')
const votingFactory = artifacts.require('VotingFactory')
const rpvSale = artifacts.require('RPVSale')
const { toWei } = require('web3-utils')

contract('Voting testing', async (accounts) => {
  let votingContract
  let rptContract
  let rpvContract
  let rpvSaleContract
  let votingAllowListContract
  let votingFactoryContract
  let implementVoting

  const parameters = {
    rpvSaleRate: '500000000000000000',
    rpvSaleWallet: accounts[9],
    operator: accounts[1],
    hashIPFS: '0x7b502c3a1f48c8609ae212cdfb639dee39673f5e',
    buyVotingTokenRate: '500000000000000000', // rate 2,
    createProposalRate: '200000000000000000', // rate 5
    commonVoting: 0,
    landBased: 1,
    organisational: 2,
    duration: time.duration.weeks(1),
    qtyVoters: 10,
    minPercentageVoters: 20,
    holderRPTTokens: accounts[9]
  }

  async function createVoting(description, duration, qtyVoters, minPercentage) {
    await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
    await rpvContract.approve(votingFactoryContract.address, toWei('6', 'ether'))
    const { logs } = await votingFactoryContract.createVoting('0', description, duration, qtyVoters, minPercentage)
    implementVoting = await voting.at(logs[0].args.instanceAddress)
  }

  async function buyVotingToken(from) {
    await rpvSaleContract.sendTransaction({ from, value: toWei('3', 'ether') })
    await rpvContract.approve(implementVoting.address, toWei('6', 'ether'), { from })
    await implementVoting.buy(2, { from })
  }

  async function initialization(
    description = parameters.hashIPFS,
    duration = parameters.duration,
    qtyVoters = parameters.qtyVoters,
    minPercentage = parameters.minPercentageVoters
  ) {
    rpvSaleContract = await rpvSale.new(parameters.rpvSaleRate, parameters.rpvSaleWallet)
    rpvContract = await RPVToken.new(rpvSaleContract.address)
    rptContract = await RPTToken.new(parameters.holderRPTTokens)
    await rpvSaleContract.setToken(rpvContract.address, { from: accounts[0] })
    votingFactoryContract = await votingFactory.new(
      rptContract.address,
      accounts[1],
      rpvSaleContract.address,
      parameters.buyVotingTokenRate,
      parameters.createProposalRate
    )
    await rptContract.transfer(votingFactoryContract.address, toWei('100000', 'ether'), {from: parameters.holderRPTTokens})
    votingAllowListContract = await votingFactoryContract.masterVotingAllowList.call()
    votingContract = await votingFactoryContract.masterVoting.call()
    await createVoting(description, duration, qtyVoters, minPercentage)
  }
  before(initialization)

  describe('Deploy', () => {
    it('Deploy smart-contracts', async () => {
      assert(votingContract !== '')
      assert(votingAllowListContract !== '')
      assert(rptContract.address !== '')
      assert(votingFactoryContract.address !== '')
    })
  })
  describe('Get State', () => {
    before(initialization)
    it('Factory Contract', async () => {
      const factory = await implementVoting.factory.call()
      assert.equal(factory, votingFactoryContract.address)
    })
    it('RPV Token', async () => {
      const token = await implementVoting.rpvToken.call()
      assert.equal(token, rpvContract.address)
    })
    it('RPVSale', async () => {
      const token = await implementVoting.rpvSale.call()
      assert.equal(token, rpvSaleContract.address)
    })
    it('Vote Description', async () => {
      const { description } = await implementVoting.params.call()
      assert.equal(description, parameters.hashIPFS)
    })
    it('Vote Duration', async () => {
      const { duration } = await implementVoting.params.call()
      assert.equal(duration.toString(), parameters.duration.toString())
    })
    it('Qty Voters', async () => {
      const { qtyVoters } = await implementVoting.params.call()
      assert.equal(qtyVoters, parameters.qtyVoters)
    })
    it('Min Percentage Voters', async () => {
      const { minPercentageVoters } = await implementVoting.params.call()
      assert.equal(minPercentageVoters, parameters.minPercentageVoters)
    })
    it('Min Qty Voters', async () => {
      await createVoting(parameters.hashIPFS, parameters.duration, 1000, parameters.minPercentageVoters)
      const { minQtyVoters } = await implementVoting.params.call()
      const equal = new BN((parameters.minPercentageVoters * 1000) / 100)
      assert.equal(minQtyVoters.toString(), equal.toString())
    })
  })
    describe('Buy tokens', () => {
      beforeEach(initialization)
      it('Expect revert', async () => {
        expectRevert(implementVoting.buy(0), 'Voting: amount > 0')
      })
      it('Expect revert', async () => {
        expectRevert(implementVoting.buy(1), 'ERC20: transfer amount exceeds balance')
      })
      it('Expect revert', async () => {
        await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
        expectRevert(implementVoting.buy(1), 'ERC20: transfer amount exceeds allowance.')
      })
      it('Successful token purchase', async () => {
        await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
        await rpvContract.approve(implementVoting.address, toWei('3', 'ether'))
        await implementVoting.buy(1)
        const amountToken = await implementVoting.balanceOf(accounts[0])
        assert.equal(amountToken, 1)
      })
    })
    describe('Vote for', () => {
      beforeEach(initialization)
      it('Vote For: expect revert', async () => {
        expectRevert(implementVoting.voteFor(), 'Not enough voting tkn')
      })
      it('Vote For: expect revert', async () => {
        await buyVotingToken(accounts[0])
        await time.increase(time.duration.weeks(3))
        expectRevert(implementVoting.voteFor(), 'Voting is over')
      })
      it('Vote For: expect revert', async () => {
        await buyVotingToken(accounts[0])
        await implementVoting.voteFor()
        expectRevert(implementVoting.voteFor(), 'Voting: already voted')
      })
      it('Vote For: successful vote', async () => {
        await buyVotingToken(accounts[0])
        const previousAmountToken = await implementVoting.balanceOf.call(accounts[0])
        const {
          _for: forPrevious,
          _against: againstPrevious,
          _count: countPrevious,
        } = await implementVoting.getStats.call()
        const { logs } = await implementVoting.voteFor()
        const { _for: forNext, _against: againstNext, _count: countNext } = await implementVoting.getStats.call()
        const nextAmountToken = await implementVoting.balanceOf.call(accounts[0])
        // // 50 for create + 10 for voting
        assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('60', 'ether'))   
        assert.equal(nextAmountToken.toString(), previousAmountToken.sub(new BN(1)).toString())
        expectEvent.inLogs(logs, 'Voted', { voter: accounts[0], choice: true })
        assert.equal(forNext.toString(), forPrevious.add(new BN(1)).toString())
        assert.equal(againstNext.toString(), againstPrevious.toString())
        assert.equal(countNext.toString(), countPrevious.add(new BN(1)).toString())
      })
    })
    describe('Vote against', () => {
      beforeEach(initialization)
      it('Vote against: expect revert', async () => {
        expectRevert(implementVoting.voteAgainst(), 'Not enough voting tkn')
      })
      it('Vote against: expect revert', async () => {
        await buyVotingToken(accounts[0])
        await time.increase(time.duration.weeks(3))
        expectRevert(implementVoting.voteAgainst(), 'Voting is over')
      })
      it('Vote against: expect revert', async () => {
        await buyVotingToken(accounts[0])
        await implementVoting.voteAgainst()
        expectRevert(implementVoting.voteAgainst(), 'Voting: already voted')
      })
      it('Vote against: successful vote', async () => {
        await buyVotingToken(accounts[0])
        const previousAmountToken = await implementVoting.balanceOf.call(accounts[0])
        const {
          _for: forPrevious,
          _against: againstPrevious,
          _count: countPrevious,
        } = await implementVoting.getStats.call()
        const { logs } = await implementVoting.voteAgainst()
        const { _for: forNext, _against: againstNext, _count: countNext } = await implementVoting.getStats.call()
        // // 50 for create + 10 for voting
        assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('60', 'ether'))   
        const nextAmountToken = await implementVoting.balanceOf.call(accounts[0])
        assert.equal(nextAmountToken.toString(), previousAmountToken.sub(new BN(1)).toString())
        expectEvent.inLogs(logs, 'Voted', { voter: accounts[0], choice: false })
        assert.equal(forNext.toString(), forPrevious.toString())
        assert.equal(againstNext.toString(), againstPrevious.add(new BN(1)).toString())
        assert.equal(countNext.toString(), countPrevious.add(new BN(1)).toString())
      })
    })
    describe('Finish Voting', () => {
      beforeEach(initialization)
      it('Finish Voting: expect revert', async () => {
        expectRevert(implementVoting.finishVoting({ from: parameters.operator }), 'Voting is not over')
      })
      it('Finish Voting: voting failed', async () => {
        const {
          _for: forPrevious,
          _against: againstPrevious,
          _count: countPrevious,
        } = await implementVoting.getStats.call()
        await time.increase(time.duration.weeks(3))
        const { logs } = await implementVoting.finishVoting({ from: parameters.operator })
        expectEvent.inLogs(logs, 'VotingFailed', {
          _for: forPrevious,
          _against: againstPrevious,
          _total: countPrevious,
        })
      })
      it('Finish Voting: voting successful', async () => {
        const {
          _for: forPrevious,
          _against: againstPrevious,
          _count: countPrevious,
        } = await implementVoting.getStats.call()
        await buyVotingToken(accounts[0])
        await implementVoting.voteAgainst()
        await buyVotingToken(accounts[2])
        await implementVoting.voteAgainst({ from: accounts[2] })
        await buyVotingToken(accounts[3])
        await implementVoting.voteFor({ from: accounts[3] })
        await time.increase(time.duration.weeks(3))
        const { logs } = await implementVoting.finishVoting({ from: parameters.operator })
        expectEvent.inLogs(logs, 'VotingSuccessful', {
          _for: forPrevious.add(new BN(1)),
          _against: againstPrevious.add(new BN(2)),
          _total: countPrevious.add(new BN(3)),
        })
      })
    })
    describe('Get functions', () => {
      beforeEach(initialization)
      it('Get All Voters: empty', async () => {
        const arrayVoters = await implementVoting.getAllVoters.call()
        expect(arrayVoters).deep.to.equal([])
      })
      it('Get All Voters: three voters', async () => {
        const mockArray = [accounts[0], accounts[1], accounts[2]]
        await buyVotingToken(accounts[0])
        await implementVoting.voteAgainst()
        await buyVotingToken(accounts[1])
        await implementVoting.voteAgainst({ from: accounts[1] })
        await buyVotingToken(accounts[2])
        await implementVoting.voteAgainst({ from: accounts[2] })
        const arrayVoters = await implementVoting.getAllVoters.call()
        expect(arrayVoters).deep.to.equal(mockArray)
      })
      it('Get Voter By Index: expect revert', async () => {
        expectRevert(implementVoting.getVoterByIndex.call(0), 'Index does not exist')
      })
      it('Get Voter By Index', async () => {
        await buyVotingToken(accounts[0])
        await implementVoting.voteAgainst()
        const voter = await implementVoting.getVoterByIndex.call(0)
        assert.equal(voter, accounts[0])
      })
    })
    describe('Get Voter Count', () => {
      before(initialization)
      const array = [1, 2, 3, 4, 5]
      array.forEach((item) => {
        it(`Should return ${item}`, async () => {
          await buyVotingToken(accounts[item])
          await implementVoting.voteAgainst({ from: accounts[item] })
          const qty = await implementVoting.getVoterCount.call()
          assert.equal(qty, item)
        })
      })
    })
    describe('Get Stats', () => {
      before(initialization)
      const mockArray = [
        { account: accounts[1], vote: false },
        { account: accounts[2], vote: true },
        { account: accounts[3], vote: false },
        { account: accounts[4], vote: true },
        { account: accounts[5], vote: false },
        { account: accounts[6], vote: false },
        { account: accounts[7], vote: false },
        { account: accounts[8], vote: true },
      ]
      mockArray.forEach((item, i) => {
        it(`Vote: ${i}`, async () => {
          const {
            _for: previousFor,
            _against: previousAgainst,
            _count: previousCount,
          } = await implementVoting.getStats()
          await buyVotingToken(item.account)
          if (item.vote) {
            await implementVoting.voteFor({ from: item.account })
            const { _for: nextFor, _against: nextAgainst, _count: nextCount } = await implementVoting.getStats()
            assert.equal(nextFor.toString(), previousFor.add(new BN(1)).toString())
            assert.equal(nextAgainst.toString(), previousAgainst.toString())
            assert.equal(nextCount.toString(), previousCount.add(new BN(1)).toString())
          } else {
            await implementVoting.voteAgainst({ from: item.account })
            const { _for: nextFor, _against: nextAgainst, _count: nextCount } = await implementVoting.getStats()
            assert.equal(nextFor.toString(), previousFor.toString())
            assert.equal(nextAgainst.toString(), previousAgainst.add(new BN(1)).toString())
            assert.equal(nextCount.toString(), previousCount.add(new BN(1)).toString())
          }
        })
      })
    })
})
