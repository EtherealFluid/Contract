// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IVotingFactory.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/IVoting.sol";
import "./interfaces/IUnicornToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./interfaces/IVotingInitialize.sol";

/// @notice Voter contract
contract Voter is IVotingInitialize {

    /// @notice Indicates that user is voted
    /// @param votingInstance Address of Voting instance
    /// @param voter Address of voter
    /// @param choice Choice of  voter (True - For, False - Against)
    /// @param amount_ Amount of ICHOR tokens locked
    event Voted(address votingInstance, address voter, bool choice, uint256 amount_);

    /// @notice Indicates that voting was successfull
    /// @param _for Total amount of votes For
    /// @param _against Total amount of votes Against
    /// @param _total Total amount of voters
    event VotingSuccessful(address votingInstance, uint256 _for, uint256 _against, uint256 _total);

    /// @notice Indicates that voting was Failed
    /// @param _for Total amount of votes For
    /// @param _against Total amount of votes Against
    /// @param _total Total amount of voters
    event VotingFailed(address votingInstance, uint256 _for, uint256 _against, uint256 _total);

    /// @notice Constructor
    constructor() {}

    /// @notice Votes For
    /// @param amount_ Amount of tokens to lock
    /**
    @dev This method can be called by ICHOR holders only.
    This method can be called only while voting is active.
    **/
    function voteFor(
        address votingInstance,
        uint256 amount_
    ) external {
        IVoting(votingInstance).voteFor(msg.sender, amount_);
        uint256 amountWithFee = amount_ - ((amount_ * 4) / 100);
        emit Voted(votingInstance, msg.sender, true, amountWithFee);
    }

    /// @notice Votes Against
    /// @param amount_ Amount of tokens to lock
    /**
    @dev This method can be called by ICHOR holders only.
    This method can be called only while voting is active.
    **/
    function voteAgainst(
        address votingInstance,
        uint256 amount_
    ) external {
        IVoting(votingInstance).voteAgainst(msg.sender, amount_);
        uint256 amountWithFee = amount_ - ((amount_ * 4) / 100);
        emit Voted(votingInstance, msg.sender, false, amountWithFee);
    }

    /// @notice Returns voting results (by event)
    /**
    @dev This method can be called only when voting is over.
    **/
    function getVotingResults(address votingInstance) external {
        Params memory params = IVoting(votingInstance).getVotingParams();
        require(
            block.timestamp > params.start + params.duration,
            "Voting: Voting is not over!"
        );
        (uint256 _for, uint256 _against, uint256 _total) = IVoting(votingInstance).getStats();
        if (_total >= params.minQtyVoters) {
            emit VotingSuccessful(votingInstance, _for, _against, _total);
        } else {
            emit VotingFailed(votingInstance, _for, _against, _total);
        }
    }

}
