// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVotingFactory {
    enum VotingVariants {COMMON, LANDBASED, ORGANISATIONAL}

    function operator() external view returns (address);
    
    function rewardForCreate() external view returns (uint256);

    function rewardForVoting() external view returns (uint256);

    function masterVoting() external view returns (address);

    function masterVotingAllowList() external view returns (address);

    function buyVotingTokenRate() external view returns (uint256);

    function createProposalRate() external view returns (uint256);

    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters
    ) external;

    function getVotingInstancesLength() external view returns (uint256);

    function setMasterVoting(address _newMasterVoting) external;

    function setMasterVotingAllowList(address _newMasterVotingAllowListContract) external;

    function setVotingTokenRate(uint256 _newBuyVotingTokenRate) external;

    function setCreateProposalRate(uint256 _newCreateProposalRate) external;

    function setAdminRole(address _newAdmin) external;

    function votingReward(address _recipient) external;

    function withdrawRpt(address _recipient) external;

    function setRewardForCreate(uint256 _newReward) external;

    function setRewardForVoting(uint256 _newReward) external;

    event CreateVoting(address indexed instanceAddress, VotingVariants indexed instanceType);
    event SetMasterVoting(address indexed previousContract, address indexed newContract);
    event SetMasterVotingAllowList(address indexed previousContract, address indexed newContract);
    event SetVotingTokenRate(uint256 indexed previousRate, uint256 indexed newRate);
    event SetCreateProposalRate(uint256 indexed previousRate, uint256 indexed newRate);
}
