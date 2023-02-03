pragma solidity ^0.8.4;

interface IStakingContract {
    function getStakedAmount (address user) external returns(uint256);

    function stake (uint256 amount) external;

    function unstake (uint256 amount) external;

    function setMinimalStakingPeriod (uint256 stakingPeriod_) external;

    function stakeTransfer(address from, address to, uint256 amount) external;
}