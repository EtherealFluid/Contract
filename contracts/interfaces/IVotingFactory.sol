// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IVotingInitialize.sol";

interface IVotingFactory is IVotingInitialize {
    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters,
        address _applicant
    ) external;

    function getVotingInstancesLength() external view returns (uint256);

    function isVotingInstance(address instance) external view returns (bool);

    event CreateVoting(
        address indexed instanceAddress,
        VotingVariants indexed instanceType
    );
    event SetMasterVoting(
        address indexed previousContract,
        address indexed newContract
    );
    event SetMasterVotingAllowList(
        address indexed previousContract,
        address indexed newContract
    );
    event SetVotingTokenRate(
        uint256 indexed previousRate,
        uint256 indexed newRate
    );
    event SetCreateProposalRate(
        uint256 indexed previousRate,
        uint256 indexed newRate
    );

}
