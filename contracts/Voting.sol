// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './VotingToken.sol';
import './IVotingFactory.sol';
import './IVotingInitialize.sol';

/// @title Voting contract
contract Voting is VotingToken, IVotingInitialize {

    using SafeMathUpgradeable for uint256;

    struct ballot {
        address voterAddress;
        bool choice;
    }
    /// @return params Returns initialization params for Voting
    Params public params;

    /// @return factory Returns address of VotingFactory contract
    IVotingFactory public factory;

    /// @return rpvToken Returns address of RPVToken contract
    IERC20Upgradeable public rpvToken;

    /// @return rpvSale Returns address of RPVsale contract
    address public rpvSale;

    uint256 internal totalForVotes;
    uint256 internal totalAgainstVotes;
    mapping(address => bool) internal mVoters;
    ballot[] internal voters;

    /// @notice Emitted when user votes
    /// @param voter Address of voter
    /// @param choice Voter's choice
    event Voted(address voter, bool choice);

    /// @notice Emitted when voting was successful. (If the minimum number of users votes)
    /// @param _for Amount of voters who voted "for"
    /// @param _against Amount of voters who voted "against"
    /// @param _total Total amount of voters
    event VotingSuccessful(uint256 _for, uint256 _against, uint256 _total);

    /// @notice Emitted when voting was failed. (If the minimum number of users does not vote)
    /// @param _for Amount of voters who voted "for"
    /// @param _against Amount of voters who voted "against"
    /// @param _total Total amount of voters
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

    /// @notice Initialization method
    /// @param _params Initialization params for Voting
    /// @param _rpvSale Address of RPVSale contract
    /// @param _rpvToken Address of RPVToken contract
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

    /// @return addressVoters Array of addresses of voters
    function getAllVoters() external view returns (address[] memory) {
        address[] memory addressVoters = new address[](voters.length);
        for (uint256 i = 0; i < voters.length; i++) {
            addressVoters[i] = voters[i].voterAddress;
        }
        return addressVoters;
    }

    /// @return _voterIndex  Index of voter
    function getVoterByIndex(uint256 _voterIndex) external view returns (address) {
        require(_voterIndex < voters.length, 'Index does not exist');
        return voters[_voterIndex].voterAddress;
    }

    /// @return length Total amount of voters
    function getVoterCount() public view returns (uint256) {
        return voters.length;
    }

    /// @notice Voting stats
    /// @return totalForVotes Amount of voters who voted "for"
    /// @return totalAgainstVotes Amount of voters who voted "against"
    /// @return getVoterCountlength Total amount of voters
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

    /// @notice Function of purchasing VoteTokens for RPVTokens
    /// @param amount Amount of VoteTokens to buy
    function buy(uint256 amount) external votingIsActive {
        require(amount > 0, 'Voting: amount > 0');
        uint256 decimals = 10 ** 18;
        amount = amount.mul(decimals);
        uint256 rpvAmount = amount.mul(decimals).div(params.buyVotingTokenRate);
        rpvToken.transferFrom(_msgSender(), rpvSale, rpvAmount);
        _mint(_msgSender(), amount.div(decimals)); 
    }

    /// @notice Function for voting "for". You can only vote once, if voting is still active and you are a VotingToken holder
    function voteFor() public virtual tokenHoldersOnly neverVoted votingIsActive {
        totalForVotes++;
        _burn(_msgSender(), 1);
        voters.push(ballot({voterAddress: _msgSender(), choice: true}));
        mVoters[_msgSender()] = true;
        factory.votingReward(_msgSender());
        emit Voted(_msgSender(), true);
    }

    /// @notice Function for voting "against". You can only vote once, if voting is still active and you are a VotingToken holder
    function voteAgainst() public virtual tokenHoldersOnly neverVoted votingIsActive {
        totalAgainstVotes++;
        _burn(_msgSender(), 1);
        voters.push(ballot({voterAddress: _msgSender(), choice: false}));
        mVoters[_msgSender()] = true;
        factory.votingReward(_msgSender());
        emit Voted(_msgSender(), false);
    }

    /// @notice Function for getting voting stats after voting is over. Also returns whether the vote was successful or not
    function finishVoting() external votingIsOver {
        (uint256 _for, uint256 _against, uint256 _total) = getStats();
        if (_total >= params.minQtyVoters) {
            emit VotingSuccessful(_for, _against, _total);
        } else {
            emit VotingFailed(_for, _against, _total);
        }
    }
}
