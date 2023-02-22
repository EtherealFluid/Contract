// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/ISacrificeToken.sol";
import "./interfaces/IUnicornToken.sol";


contract UnicornRewards is Ownable {
    
    /// @notice Time reward distribution ends
    uint256 public finishAt;

    /// @notice Last time reward was updated
    uint256 public updatedAt;

    /// @notice Reward amount
    uint256 public rewardAmount;

    /// @notice Reward per token stored
    uint256 public rewardPerTokenStored;

    /// @notice ICHOR instance
    IICHOR public ichorToken;

    /// @notice UnicornToken instance
    IUnicornToken public unicornToken;

    /// @notice Mapping (address => uint256). Contains reward per token paid for user
    mapping(address => uint256) public userRewardPerTokenPaid;

    /// @notice Mapping (address => uint256). Contains users rewards
    mapping(address => uint256) public rewards;

    /// @notice Total supply (total amount of Unicorns)
    uint256 public totalSupply;

    /// @notice Mapping (address => uint256). Contains users balances
    mapping(address => uint256) public balanceOf;

    constructor() {}

   /// @notice Checks if caller is a Unicorn
    modifier onlyUnicorn() {
        require(
            msg.sender == address(unicornToken),
            "StakingContract: caller is not a UnicornToken!"
        );
        _;
    }

    /// @notice Checks if caller is a ICHOR token
    modifier onlyIchor() {
        require(
            msg.sender == address(ichorToken),
            "StakingContract: caller is not an Ichor!"
        );
        _;
    }

    /// @notice Updates reward for user
    /// @param _account User address
    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }

        _;
    }

    /// @notice Sets new ICHOR token address
    /// @param ichorToken_ New ICHOR token address
    /// @dev This method can be called only by an Owner of the contract
    function setIchorAddress(address ichorToken_) external onlyOwner {
        ichorToken = IICHOR(ichorToken_);
    }

    /// @notice Returns current ICHOR token address
    /// @return address Current ICHOR token address
    function getIchorAddress() external view returns (address) {
        return address(ichorToken);
    }

    /// @notice Sets new Unicorn token address
    /// @param unicornToken_ New Unicorn token address
    /// @dev This method can be called only by an Owner of the contract
    function setUnicornToken(address unicornToken_) external onlyOwner {
        unicornToken = IUnicornToken(unicornToken_);
    }

    /// @notice Returns current Unicorn token address
    /// @return address Current Unicorn token address
    function getUnicornToken() external view returns (address) {
        return address(unicornToken);
    }
    
    /// @notice Returns last time reward applicable
    /// @return time Last time reward applicable
    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(finishAt, block.timestamp);
    }

    /// @notice Returns reward per token stored
    /// @return amount Reward per token stored
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardAmount * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    /// @notice Adds Unicron to tokens distribution
    /// @param _account Unicorn address
    /// @dev This method can be called only by UnicornToken
    function stake(
        address _account
    ) external onlyUnicorn updateReward(_account) {
        balanceOf[_account] = 1;
        totalSupply += 1;
    }

    /// @notice Removes Unicron from tokens distribution
    /// @param _account Unicorn address
    /// @dev This method can be called only by UnicornToken
    function unstake(
        address _account
    ) external onlyUnicorn updateReward(_account) {
        balanceOf[_account] = 1;
        totalSupply -= 1;
    }

    /// @notice Returns amount of earned tokens
    /// @param _account User address
    /// @return amount Amount of earned tokens
    function earned(address _account) public view returns (uint256) {
        return
            ((balanceOf[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    /// @notice Transfers reward to caller
    /// @dev Can be called only after staking period ends
    function getReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            ichorToken.transfer(msg.sender, reward);
        }
    }

    /// @notice Distribure rewards to stakers
    /// @param _amount Amount to distribure
    /// @dev This method can be called only by ICHOR
    function notifyRewardAmount(
        uint256 _amount
    ) public onlyIchor updateReward(address(0)) {
        if (block.timestamp >= finishAt) {
            rewardAmount = _amount;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) *
                rewardAmount;
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

    /// @notice Method for finding the minimum of 2 numbers
    /// @param x First number
    /// @param y Second number
    /// @return Number The smallest of 2 numbers
    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }
}
