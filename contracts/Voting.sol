// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IVotingFactory.sol';
import './interfaces/IVotingInitialize.sol';
import './interfaces/IICHOR.sol';
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';


//import './interfaces/UnicornToken.sol';

/// @title Voting contract
contract Voting is IVotingInitialize, Initializable, ContextUpgradeable {
    struct ballot {
        address voterAddress;
        bool choice;
    }
    /// @dev return params Returns initialization params for Voting
    Params public params;

/*     /// @return factory Returns address of VotingFactory contract
    IVotingFactory public factory; */

    uint256 internal totalForVotes;
    uint256 internal totalAgainstVotes;
    mapping(address => bool) internal mVoters;
    ballot[] internal voters;

    //address unicornAddress;
    IICHOR public ichorToken;
    //address ichorTokenAddress;

    bool resultCompleted;
    address applicant;
    

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

    modifier votingResultNotCompleted() {
        require(!resultCompleted, 'Voting result already completed!');
        _;
    }

    modifier tokenHoldersOnly() {
        require(ichorToken.balanceOf(_msgSender()) >= 50 * 10 ^ 9, 'Not enough voting tkn');
        _;
    }

    modifier votingIsOver() {
        require(block.timestamp > params.start + params.duration, 'Voting is not over');
        _;
    }

    modifier votingIsActive() {
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

    function initialize(
        Params memory _params,
        address _applicant,
        address _ichorTokenAddress
        
    ) public virtual override initializer {
        //factory = IVotingFactory(_msgSender());
        params = _params;
        //TODO COPY INSTANCE IMPLEMENTATION TO ALL CONTRACTS
        ichorToken = IICHOR(_ichorTokenAddress);
        resultCompleted = false;
        applicant = _applicant;
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

    function voteFor() public virtual tokenHoldersOnly neverVoted votingIsActive {
        totalForVotes++;
        //_burn(_msgSender(), 1);
        //TODO transfer tokens to??
        voters.push(ballot({voterAddress: _msgSender(), choice: true}));
        mVoters[_msgSender()] = true;
        emit Voted(_msgSender(), true);
    }

    function voteAgainst() public virtual tokenHoldersOnly neverVoted votingIsActive {
        totalAgainstVotes++;
        //_burn(_msgSender(), 1);
        //TODO transfer tokens to??
        voters.push(ballot({voterAddress: _msgSender(), choice: false}));
        mVoters[_msgSender()] = true;
        emit Voted(_msgSender(), false);
    }

    function finishVoting() external votingIsOver votingResultNotCompleted {
       /*  resultCompleted = true;
        (uint256 _for, uint256 _against, uint256 _total) = getStats();
        if (_total >= params.minQtyVoters && _for > _against) {
            if (params.votingType == "UNICORN") {
                //TODO set suggested addres unicorn
            } else if (params.votingType == "CHARITY") {
                IICHOR.setCharityAddress(applicant);
            }
        } */
    }

    function getVotingResults () external votingIsOver {
        (uint256 _for, uint256 _against, uint256 _total) = getStats();
        if (_total >= params.minQtyVoters) {
            emit VotingSuccessful(_for, _against, _total);
        } else {
            emit VotingFailed(_for, _against, _total);
        }
    }
}
