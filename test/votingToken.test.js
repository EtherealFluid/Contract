const { expectEvent, time, expectRevert } = require('@openzeppelin/test-helpers')
const { assert } = require('chai')

const RPVToken = artifacts.require('RPVToken')
const RPTToken = artifacts.require('RPTToken')
const voting = artifacts.require('Voting')
const votingFactory = artifacts.require('VotingFactory')
const rpvSale = artifacts.require('RPVSale')
const { toWei } = require('web3-utils')

contract('Voting Token', async (accounts) => {
  let rptContract
  let rpvContract
  let rpvSaleContract
  let votingFactoryContract
  let implementVoting

  const parameters = {
    rptSaleRate: '500000000000000000',
    rptSaleWallet: accounts[9],
    operator: accounts[1],
    zeroAddress: '0x0000000000000000000000000000000000000000',
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
    await time.advanceBlock()
    rptContract = await RPTToken.new(parameters.holderRPTTokens)
    rpvSaleContract = await rpvSale.new(parameters.rptSaleRate, parameters.rptSaleWallet)
    rpvContract = await RPVToken.new(rpvSaleContract.address)
    await rpvSaleContract.setToken(rpvContract.address, { from: accounts[0] })
    votingFactoryContract = await votingFactory.new(
      rptContract.address,
      accounts[1],
      rpvSaleContract.address,
      parameters.buyVotingTokenRate,
      parameters.createProposalRate
    )
    await rptContract.transfer(votingFactoryContract.address, toWei('100000', 'ether'), {from: parameters.holderRPTTokens})

    await createVoting(description, duration, qtyVoters, minPercentage)
  }
  before(initialization)
  describe('Total Supply', () => {
    before(initialization)
    it('Total Supply', async () => {
      await buyVotingToken(accounts[0])
      const total = await implementVoting.totalSupply.call()
      assert.equal(total, 2)
    })
  })
  describe('Approve', () => {
    it('Approve: expect revert', async () => {
      await buyVotingToken(accounts[0])
      expectRevert(implementVoting.approve(parameters.zeroAddress, 2), 'VT: spender != address(0)')
    })
    it('Approve: successful', async () => {
      await buyVotingToken(accounts[0])
      const { logs } = await implementVoting.approve(accounts[1], 2)
      const amount = await implementVoting.allowance(accounts[0], accounts[1])
      assert.equal(amount, 2)
      expectEvent.inLogs(logs, 'Approval', { owner: accounts[0], spender: accounts[1], value: '2' })
    })
  })
  describe('Transfer', () => {
    beforeEach(initialization)
    it('Transfer: expect revert', async () => {
      await buyVotingToken(accounts[0])
      expectRevert(implementVoting.transfer(accounts[1], 10), 'VT: amount exceeds balance')
    })
    it('Transfer: expect revert', async () => {
      await buyVotingToken(accounts[0])
      expectRevert(implementVoting.transfer(parameters.zeroAddress, 10), 'VT: recipient != address(0)')
    })
    it('Transfer: successful', async () => {
      await buyVotingToken(accounts[0])
      const { logs } = await implementVoting.transfer(accounts[1], 2)
      expectEvent.inLogs(logs, 'Transfer', { from: accounts[0], to: accounts[1], value: '2' })
    })
    it('TransferFrom: successful', async () => {
      await buyVotingToken(accounts[2])
      await implementVoting.approve(accounts[3], 2, { from: accounts[2] })
      const { logs } = await implementVoting.transferFrom(accounts[2], accounts[3], 2, { from: accounts[3] })
      expectEvent.inLogs(logs, 'Transfer', { from: accounts[2], to: accounts[3], value: '2' })
    })
    it('TransferFrom: expect revert', async () => {
      await buyVotingToken(accounts[0])
      await implementVoting.approve(accounts[1], 2)
      expectRevert(
        implementVoting.transferFrom(accounts[0], accounts[1], 3, { from: accounts[1] }),
        'VT: amount exceeds balance'
      )
    })
    it('TransferFrom: expect revert', async () => {
      await buyVotingToken(accounts[2])
      await implementVoting.approve(accounts[3], 2, { from: accounts[2] })
      expectRevert(
        implementVoting.transferFrom(parameters.zeroAddress, accounts[3], 2, { from: accounts[3] }),
        'VT: sender != address(0)'
      )
    })
    it('TransferFrom: expect revert', async () => {
      await buyVotingToken(accounts[2])
      await implementVoting.approve(accounts[3], 2, { from: accounts[2] })
      expectRevert(
        implementVoting.transferFrom(accounts[2], parameters.zeroAddress, 2, { from: accounts[3] }),
        'VT: recipient != address(0)'
      )
    })
    it('TransferFrom: expect revert', async () => {
      await buyVotingToken(accounts[2])
      await implementVoting.approve(accounts[3], 1, { from: accounts[2] })
      expectRevert(
        implementVoting.transferFrom(accounts[2], accounts[3], 2, { from: accounts[3] }),
        'VT: amount exceeds allowance'
      )
    })
    it('TransferFrom: expect revert', async () => {
      await buyVotingToken(accounts[2])
      await implementVoting.approve(accounts[3], 2, { from: accounts[2] })
      expectRevert(
        implementVoting.transferFrom(accounts[2], parameters.zeroAddress, 10, { from: accounts[3] }),
        'VT: amount exceeds balance'
      )
    })
  })
})
