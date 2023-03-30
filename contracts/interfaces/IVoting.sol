// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IVotingInitialize.sol";

interface IVoting is IVotingInitialize {
    function initialize(
        Params memory _params,
        address _applicant,
        address _ichorTokenAddress,
        address _unicornToken,
        address _voterContractAddress,
        VotingVariants votingType
    ) external;

    function getAllVoters() external view returns (address[] memory);

    function getbalanceVoted(address account_) external view returns (uint256);

    function getVoterCount() external view returns (uint256);

    function getStats()
        external
        view
        returns (uint256 _for, uint256 _against, uint256 _count);

    function voteFor(address user, uint256 amount_) external;

    function voteAgainst(address user, uint256 amount_) external;

    function finishVoting() external;

    //function getVotingResults() external;

    function getVotingParams() external view returns (Params memory);

    function withdraw() external;
}
