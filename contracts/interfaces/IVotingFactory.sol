// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVotingFactory {
    enum VotingVariants {UNICORN, CHARITY}

    function operator() external view returns (address);
    
    function rewardForCreate() external view returns (uint256);

    function rewardForVoting() external view returns (uint256);

    function masterVoting() external view returns (address);

    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters
    ) external;

    function getVotingInstancesLength() external view returns (uint256);

    function setMasterVoting(address _newMasterVoting) external;

    event CreateVoting(address indexed instanceAddress, VotingVariants indexed instanceType);
    event SetMasterVoting(address indexed previousContract, address indexed newContract);
    event SetMasterVotingAllowList(address indexed previousContract, address indexed newContract);
    event SetVotingTokenRate(uint256 indexed previousRate, uint256 indexed newRate);
    event SetCreateProposalRate(uint256 indexed previousRate, uint256 indexed newRate);
}
