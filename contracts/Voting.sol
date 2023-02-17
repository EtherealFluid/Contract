// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IVotingFactory.sol';
//import './interfaces/IVotingInitialize.sol';
import './interfaces/IICHOR.sol';
import './interfaces/IVoting.sol';
import "./interfaces/IUnicornToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import "./interfaces/IVotingInitialize.sol";


//import './interfaces/UnicornToken.sol';

/// @title Voting contract
contract Voting is Initializable, ContextUpgradeable, IVoting {
    struct ballot {
        address voterAddress;
        bool choice;
    }
    /// @dev return params Returns initialization params for Voting
    Params public params;

    uint256 internal totalForVotes;
    uint256 internal totalAgainstVotes;
    ballot[] internal voters;
    mapping (address => uint256) internal balancesFor;
    mapping (address => uint256) internal balancesAgainst;

    //address unicornAddress;
    IICHOR public ichorToken;
    //address ichorTokenAddress;
    IUnicornToken public unicornToken;

    bool resultCompleted;
    address applicant;

    uint256 totalAmountFor;
    uint256 totalAmountAgainst;

    VotingVariants votingType;
    
    

    /// @notice Emitted when user votes
    /// @param voter Address of voter
    /// @param choice Voter's choice
    event Voted(address voter, bool choice, uint256 amount_);

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
        require(!resultCompleted, 'Voting: Voting result already completed!');
        _;
    }

    modifier tokenHoldersOnly() {
        require(ichorToken.balanceOf(_msgSender()) > 0, 'Voting: Not enough ICHOR tokens!');
        _;
    }

    modifier votingIsOver() {
        require(block.timestamp > params.start + params.duration, 'Voting: Voting is not over!');
        _;
    }

    modifier votingIsActive() {
        require(
            block.timestamp >= params.start && block.timestamp <= (params.start + params.duration),
            'Voting: Voting is over'
        );
        _;
    }

    function initialize(
        Params memory _params,
        address _applicant,
        address _ichorTokenAddress,
        address _unicornToken,
        VotingVariants _votingType
        
    ) public virtual override initializer {
        params = _params;
        ichorToken = IICHOR(_ichorTokenAddress);
        resultCompleted = false;
        applicant = _applicant;
        unicornToken = IUnicornToken(_unicornToken);
        votingType = _votingType;
    }

    function getAllVoters() external view returns (address[] memory) {
        address[] memory addressVoters = new address[](voters.length);
        for (uint256 i = 0; i < voters.length; i++) {
            addressVoters[i] = voters[i].voterAddress;
        }
        return addressVoters;
    }

    function getVoterCount() public view returns (uint256) {
        return voters.length;
    }

    function getbalanceVoted(address account_) external view returns (uint256) {
        if (balancesFor[account_] > 0) {
            return balancesFor[account_];
        } else {
            return balancesAgainst[account_];
        }
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
        return (totalAmountFor, totalAmountAgainst, getVoterCount());
    }

    function voteFor(uint256 amount_) public virtual tokenHoldersOnly votingIsActive {
        require(balancesAgainst[_msgSender()] == 0, "Voting: you cant vote for two options!");
        ichorToken.transferFrom(_msgSender(), address(this), amount_);
        
        if (balancesFor[_msgSender()] == 0) {
            voters.push(ballot({voterAddress: _msgSender(), choice: true}));
        }

        uint256 amountWithFee = amount_ - ((amount_ * 4) / 100);

        balancesFor[_msgSender()] += amountWithFee;
        totalAmountFor += amountWithFee;
        totalForVotes++;
        emit Voted(_msgSender(), true, amountWithFee);
    }

    function voteAgainst(uint256 amount_) public virtual tokenHoldersOnly votingIsActive {
        require(balancesFor[_msgSender()] == 0, "Voting: you cant vote for two options!");
        ichorToken.transferFrom(_msgSender(), address(this), amount_);
        
        if (balancesAgainst[_msgSender()] == 0) {
            voters.push(ballot({voterAddress: _msgSender(), choice: false}));
        }
        uint256 amountWithFee = amount_ - ((amount_ * 4) / 100);

        balancesAgainst[_msgSender()] += amountWithFee;
        totalAmountAgainst += amountWithFee;
        totalAgainstVotes++;
        
        emit Voted(_msgSender(), false, amountWithFee);
    }

    function finishVoting() external votingIsOver votingResultNotCompleted {
        resultCompleted = true;
        (uint256 _for, uint256 _against, uint256 _total) = getStats();
        
        if (_total >= params.minQtyVoters) {
            if (_for > _against) {
                if (votingType == VotingVariants.UNICORN) {
                    unicornToken.mint(applicant);
                } else if (votingType == VotingVariants.CHARITY) {
                    ichorToken.setCharityAddress(applicant);
                }
            }
        }
    }

    function getVotingResults () external votingIsOver {
        (uint256 _for, uint256 _against, uint256 _total) = getStats();
        if (_total >= params.minQtyVoters) {
            emit VotingSuccessful(_for, _against, _total);
        } else {
            emit VotingFailed(_for, _against, _total);
        }
    }

    function withdraw() external votingIsOver {
        require(balancesFor[_msgSender()] > 0 || balancesAgainst[_msgSender()] > 0, "Voting: no tokens to withdraw");
        uint256 amountToTransfer;
        if (balancesFor[_msgSender()] > 0) {
            amountToTransfer = balancesFor[_msgSender()];
        } else {
            amountToTransfer = balancesAgainst[_msgSender()];
        }
        ichorToken.transfer(_msgSender(), amountToTransfer);
    }
}
