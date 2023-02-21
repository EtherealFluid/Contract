pragma solidity ^0.8.4;

interface IUnicornRewards {
    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function stake(address _account) external;

    function unstake(address _account) external;

    function earned(address _account) external view returns (uint256);

    function getReward() external;

    function notifyRewardAmount(uint256 _amount) external;
}
