pragma solidity ^0.8.4;

interface IStakingContract {
    function stakeTransfer(address from, address to, uint256 amount) external;

    function setIchorAddress(address ichorToken_) external;

    function getIchorAddress() external view returns (address);

    function getStakedAmount(address user) external view returns (uint256);

    function getTimeStakeEnds(address user) external view returns (uint256);

    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function stake(uint256 _amount) external;

    function unstake() external;

    function earned(address _account) external view;

    function getReward() external;

    function notifyRewardAmount(uint256 _amount) external;

    function setMinimalStakingPeriod(uint256 stakingPeriod_) external;

    function transferOwnership(address newOwner) external;
}
