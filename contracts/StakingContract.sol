// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/ISacrificeToken.sol";

import "hardhat/console.sol";

contract StakingContract is Ownable {

    uint256 public finishAt;

    uint256 public updatedAt;

    uint256 public rewardAmount;

    uint256 public rewardPerTokenStored;

    uint256 public stakingPeriod;

    mapping(address => uint256) public userRewardPerTokenPaid;

    mapping(address => uint256) public rewards;

    uint256 denominator = 100;

    address private ichorToken;
    address private sacrificeToken;

    mapping(address => bool) isStaked;

    mapping(address => uint256) timeStakeEnds;

    constructor(address sacrificeToken_, uint256 stakingPeriod_) {
        sacrificeToken = sacrificeToken_;
        stakingPeriod = stakingPeriod_;
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
    
    modifier onlyTrusted {
        require(msg.sender == ichorToken || msg.sender == address(this), "StakingContract: caller is not THIS or ICHOR token!");
        _;
    }

    modifier stakePeriodEnded(address from) {
        require(block.timestamp >= timeStakeEnds[from], "StakingContract: period not ended!");
        _;
    }

    function setIchorAddress(address ichorToken_) external onlyOwner {
        ichorToken = ichorToken_;
    }

    function getIchorAddress() external view returns(address) {
        return ichorToken;
    }

    function getStakedAmount(address user) external view returns(uint256) {
        return ISacrificeToken(sacrificeToken).balanceOf(user);
    }

    function getTimeStakeEnds(address user) external view returns(uint256) {
        return timeStakeEnds[user];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(finishAt, block.timestamp);
    }

    function rewardPerToken() public view returns (uint256) {
        uint256 totalSupply = ISacrificeToken(sacrificeToken).totalSupply();
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardAmount * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(ISacrificeToken(sacrificeToken).balanceOf(msg.sender) == 0, "StakingContract: tokens already staked!");
        require(_amount > 0, "StakingContract: amount is 0!");
        IICHOR(ichorToken).transferFrom(msg.sender, address(this), _amount);
        isStaked[msg.sender] = true;
        timeStakeEnds[msg.sender] = block.timestamp + stakingPeriod;
        ISacrificeToken(sacrificeToken).mint(msg.sender, _amount);
    }

    function unstake() external updateReward(msg.sender) {
        require(ISacrificeToken(sacrificeToken).balanceOf(msg.sender) > 0, "StakingContract: no tokens staked!");
        uint256 amountToTransfer = rewards[msg.sender];
        uint256 amountToUnstake = ISacrificeToken(sacrificeToken).balanceOf(msg.sender);
        
        ISacrificeToken(sacrificeToken).burn(msg.sender, ISacrificeToken(sacrificeToken).balanceOf(msg.sender));
        isStaked[msg.sender] = false;
        rewards[msg.sender] = 0;
        
        if (block.timestamp >= timeStakeEnds[msg.sender]) {
            IICHOR(ichorToken).transfer(msg.sender, amountToTransfer);
        } else {
            uint256 amountWithFee = amountToTransfer - (amountToTransfer * 15 ) / denominator;
            IICHOR(ichorToken).transfer(msg.sender, amountWithFee);
            this.notifyRewardAmount(amountToTransfer - amountWithFee);
        }
        IICHOR(ichorToken).transfer(msg.sender, amountToUnstake);
    }

    function earned(address _account) public view returns (uint256) {
        uint256 balance = ISacrificeToken(sacrificeToken).balanceOf(_account);
        return
            ((balance *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    function getReward() external stakePeriodEnded(msg.sender) updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            IICHOR(ichorToken).transfer(msg.sender, reward);
        }
    }

    function notifyRewardAmount(
        uint256 _amount
    ) public onlyTrusted updateReward(address(0)) {
        if (block.timestamp >= finishAt) {
            rewardAmount = _amount;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) * rewardAmount;
            rewardAmount = _amount + remainingRewards;
        }

        require(rewardAmount > 0, "reward rate = 0");
        require(
            rewardAmount <= IICHOR(ichorToken).balanceOf(address(this)),
            "reward amount > balance"
        );

        finishAt = block.timestamp + 1;
        updatedAt = block.timestamp;
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }

    function setMinimalStakingPeriod (uint256 stakingPeriod_) external onlyOwner {
        stakingPeriod = stakingPeriod_;
    }
}