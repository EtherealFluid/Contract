// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/ISacrificeToken.sol";
import './interfaces/IUnicornToken.sol';

import "hardhat/console.sol";

contract UnicornRewards is Ownable {
    uint256 public finishAt;

    uint256 public updatedAt;

    uint256 public rewardAmount;

    uint256 public rewardPerTokenStored;
    
    IICHOR public ichorToken;

    IUnicornToken public unicornToken;

    mapping(address => uint256) public userRewardPerTokenPaid;

    mapping(address => uint256) public rewards;

    // Total staked
    uint256 public totalSupply;
    // User address => staked amount
    mapping(address => uint256) public balanceOf;

    constructor() {}

    modifier onlyUnicorn {
        require(msg.sender == address(unicornToken), "StakingContract: caller is not a UnicornToken!");
        _;
    }

    modifier onlyIchor {
        require(msg.sender == address(ichorToken), "StakingContract: caller is not an Ichor!");
        _;
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }

        _;
    }

    function setIchorAddress (address ichorToken_) external onlyOwner {
        ichorToken = IICHOR(ichorToken_);
    }

    function getIchorAddress () external view returns(address) {
        return address(ichorToken);
    }

    function setUnicornToken (address unicornToken_) external onlyOwner {
        unicornToken = IUnicornToken(unicornToken_);
    }

    function getUnicornToken () external view returns(address) {
        return address(unicornToken);
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(finishAt, block.timestamp);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardAmount * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    function stake(address _account) external onlyUnicorn updateReward(_account) {
        balanceOf[_account] = 1;
        totalSupply += 1;
    }

    function unstake(address _account) external onlyUnicorn updateReward(_account) {
        balanceOf[_account] = 1;
        totalSupply -= 1;
    }

    function earned(address _account) public view returns (uint256) {
        return
            ((balanceOf[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    function getReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            ichorToken.transfer(msg.sender, reward);
        }
    }

    function notifyRewardAmount(
        uint256 _amount
    ) public onlyIchor updateReward(address(0)) {
        if (block.timestamp >= finishAt) {
            rewardAmount = _amount;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) * rewardAmount;
            rewardAmount = _amount + remainingRewards;
        }

        require(rewardAmount > 0, "UnicornRewards: rewardAmount == 0!");
        require(
            rewardAmount <= ichorToken.balanceOf(address(this)),
            "UnicornRewards: rewardAmount > balance!"
        );

        finishAt = block.timestamp + 1;
        updatedAt = block.timestamp;
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }
}
