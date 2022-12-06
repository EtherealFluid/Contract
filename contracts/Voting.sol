// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './VotingToken.sol';
import './IVotingFactory.sol';
import './IVotingInitialize.sol';

contract Voting is VotingToken, IVotingInitialize {

    using SafeMathUpgradeable for uint256;

    struct ballot {
        address voterAddress;
        bool choice;
    }
    Params public params;
    IVotingFactory public factory;
    IERC20Upgradeable public rpvToken;
    address public rpvSale;

    uint256 internal totalForVotes;
    uint256 internal totalAgainstVotes;
    mapping(address => bool) internal mVoters;
    ballot[] internal voters;

    event Voted(address voter, bool choice);
    event VotingSuccessful(uint256 _for, uint256 _against, uint256 _total);
    event VotingFailed(uint256 _for, uint256 _against, uint256 _total);

    modifier tokenHoldersOnly() {
        require(balanceOf(_msgSender()) >= 1, 'Not enough voting tkn');
        _;
    }
    modifier votingIsOver() {
        require(block.timestamp > params.start + params.duration, 'Voting is not over');
        _;
    }
    modifier votingIsActive {
        require(
            block.timestamp >= params.start && block.timestamp <= (params.start + params.duration),
            'Voting is over'
        );
        _;
    }
    modifier neverVoted() {
        require(!mVoters[_msgSender()], 'Voting: already voted');
        _;
    }

    modifier onlyOperator() {
        require(_msgSender() == factory.operator(), 'Caller is not an operator');
        _;
    }

    function initialize(
        Params memory _params,
        address _rpvSale,
        IERC20Upgradeable _rpvToken
    ) public virtual override initializer {
        VotingToken.initialize();
        factory = IVotingFactory(_msgSender());
        params = _params;
        rpvSale = _rpvSale;
        rpvToken = _rpvToken;
    }

    function getAllVoters() external view returns (address[] memory) {
        address[] memory addressVoters = new address[](voters.length);
        for (uint256 i = 0; i < voters.length; i++) {
            addressVoters[i] = voters[i].voterAddress;
        }
        return addressVoters;
    }

    function getVoterByIndex(uint256 _voterIndex) external view returns (address) {
        require(_voterIndex < voters.length, 'Index does not exist');
        return voters[_voterIndex].voterAddress;
    }

    function getVoterCount() public view returns (uint256) {
        return voters.length;
    }

    function getStats()
        public
        view
        returns (
            uint256 _for,
            uint256 _against,
            uint256 _count
        )
    {
        return (totalForVotes, totalAgainstVotes, getVoterCount());
    }

    function buy(uint256 amount) external votingIsActive {
        require(amount > 0, 'Voting: amount > 0');
        uint256 decimals = 10 ** 18;
        amount = amount.mul(decimals);
        uint256 rpvAmount = amount.mul(decimals).div(params.buyVotingTokenRate);
        rpvToken.transferFrom(_msgSender(), rpvSale, rpvAmount);
        _mint(_msgSender(), amount.div(decimals)); 
    }

    function voteFor() public virtual tokenHoldersOnly neverVoted votingIsActive {
        totalForVotes++;
        _burn(_msgSender(), 1);
        voters.push(ballot({voterAddress: _msgSender(), choice: true}));
        mVoters[_msgSender()] = true;
        factory.votingReward(_msgSender());
        emit Voted(_msgSender(), true);
    }

    function voteAgainst() public virtual tokenHoldersOnly neverVoted votingIsActive {
        totalAgainstVotes++;
        _burn(_msgSender(), 1);
        voters.push(ballot({voterAddress: _msgSender(), choice: false}));
        mVoters[_msgSender()] = true;
        factory.votingReward(_msgSender());
        emit Voted(_msgSender(), false);
    }

    function finishVoting() external votingIsOver {
        (uint256 _for, uint256 _against, uint256 _total) = getStats();
        if (_total >= params.minQtyVoters) {
            emit VotingSuccessful(_for, _against, _total);
        } else {
            emit VotingFailed(_for, _against, _total);
        }
    }
}
