// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/ISacrificeToken.sol";


contract StakingContract is Ownable {

    /// @notice Time reward distribution ends
    uint256 public finishAt;

    /// @notice Last time reward was updated
    uint256 public updatedAt;

    /// @notice Reward amount
    uint256 public rewardAmount;

    /// @notice Reward per token stored
    uint256 public rewardPerTokenStored;

    /// @notice Staking period
    uint256 public stakingPeriod;

    /// @notice Mapping (address => uint256). Contains reward per token paid for user
    mapping(address => uint256) public userRewardPerTokenPaid;

    /// @notice Mapping (address => uint256). Contains rewards for user
    mapping(address => uint256) public rewards;

    /// @notice Denominator
    uint256 private denominator = 100;

    /// @notice ICHOR token instance
    IICHOR private ichorToken;

    /// @notice Sacrifice token instance
    ISacrificeToken private sacrificeToken;

    /// @notice Mapping (address => bool). Shows if address has staked tokens
    mapping(address => bool) public isStaked;

    /// @notice Mapping (address => uint256). Shows time when stake ends for user
    mapping(address => uint256) public timeStakeEnds;

    /// @notice Indicates that user is staked
    /// @param user Address of user
    /// @param amount Amount of tokens staked
    event Staked(address user, uint256 amount);

    /// @notice Indicates that user is unstaked
    /// @param user Address of user
    /// @param amount Amount of tokens unstaked
    event Unstaked(address user, uint256 amount);

    /// @param stakingPeriod_ Staking period
    constructor(uint256 stakingPeriod_) {
        stakingPeriod = stakingPeriod_;
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

    /// @notice Checks if caller is a trusted address (ICHOR or This).
    modifier onlyTrusted() {
        require(
            msg.sender == address(ichorToken) || msg.sender == address(this),
            "StakingContract: caller is not THIS or ICHOR token!"
        );
        _;
    }

    /// @notice Checks if staking period ended for user
    /// @param _account  User address
    modifier stakePeriodEnded(address _account) {
        require(
            block.timestamp >= timeStakeEnds[_account],
            "StakingContract: period not ended!"
        );
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

    /// @notice Sets new Sacrifice token address
    /// @param sacrificeToken_ New Sacrifice token address
    /// @dev This method can be called only by an Owner of the contract
    function setSacrificeToken(address sacrificeToken_) external onlyOwner {
        sacrificeToken = ISacrificeToken(sacrificeToken_);
    }

    /// @notice Returns current Sacrifice token address
    /// @return address Current Sacrifice token address
    function getSacrificeToken() external view returns (address) {
        return address(sacrificeToken);
    }

    /// @notice Returns user's amount of staked tokens
    /// @param user Address of user
    /// @return amount User's amount of staked tokens
    function getStakedAmount(address user) external view returns (uint256) {
        return sacrificeToken.balanceOf(user);
    }

    /// @notice Returns time when minimum stake period ends for user
    /// @param user Address of user
    /// @return time Time when minimum stake period ends for user
    function getTimeStakeEnds(address user) external view returns (uint256) {
        return timeStakeEnds[user];
    }

    /// @notice Returns last time reward applicable
    /// @return time Last time reward applicable
    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(finishAt, block.timestamp);
    }

    /// @notice Returns reward per token stored
    /// @return amount Reward per token stored
    function rewardPerToken() public view returns (uint256) {
        uint256 totalSupply = sacrificeToken.totalSupply();
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardAmount * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    /// @notice Stakes ICHOR tokens from caller
    /// @param _amount Amount of ICHOR tokens to stake
    /// @dev Mints sacrifice tokens 1 to 1 on caller address 
    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(
            sacrificeToken.balanceOf(msg.sender) == 0,
            "StakingContract: tokens already staked!"
        );
        require(_amount > 0, "StakingContract: amount is 0!");
        ichorToken.transferFrom(msg.sender, address(this), _amount);
        isStaked[msg.sender] = true;
        timeStakeEnds[msg.sender] = block.timestamp + stakingPeriod;
        sacrificeToken.mint(msg.sender, _amount);
        emit Staked(msg.sender, _amount);
    }

    /// @notice Unstakes ICHOR tokens to caller
    /// @dev Takes 15% fee if called before staking period ends
    /// @dev Burns sacrifice tokens and unstakes 1 to 1 of ICHOR tokens 
    function unstake() external updateReward(msg.sender) {
        require(
            sacrificeToken.balanceOf(msg.sender) > 0,
            "StakingContract: no tokens staked!"
        );
        uint256 amountToTransfer = rewards[msg.sender];
        uint256 amountToUnstake = sacrificeToken.balanceOf(msg.sender);

        sacrificeToken.burn(msg.sender, sacrificeToken.balanceOf(msg.sender));
        isStaked[msg.sender] = false;
        rewards[msg.sender] = 0;

        if (block.timestamp >= timeStakeEnds[msg.sender]) {
            ichorToken.transfer(msg.sender, amountToTransfer);
        } else {
            uint256 amountWithFee = amountToTransfer -
                (amountToTransfer * 15) /
                denominator;
            ichorToken.transfer(msg.sender, amountWithFee);
            this.notifyRewardAmount(amountToTransfer - amountWithFee);
        }
        ichorToken.transfer(msg.sender, amountToUnstake);
        emit Unstaked(msg.sender, amountToUnstake);
    }

    /// @notice Returns amount of earned tokens
    /// @param _account User address
    /// @return amount Amount of earned tokens
    function earned(address _account) public view returns (uint256) {
        uint256 balance = sacrificeToken.balanceOf(_account);
        return
            ((balance * (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) 
                + rewards[_account];
    }

    /// @notice Transfers reward to caller
    /// @dev Can be called only after staking period ends
    function getReward()
        external
        stakePeriodEnded(msg.sender)
        updateReward(msg.sender)
    {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            ichorToken.transfer(msg.sender, reward);
        }
    }

    /// @notice Distribure rewards to stakers
    /// @param _amount Amount to distribure
    /// @dev This method can be called only by ICHOR or This
    function notifyRewardAmount(
        uint256 _amount
    ) public onlyTrusted updateReward(address(0)) {
        if (block.timestamp >= finishAt) {
            rewardAmount = _amount;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) *
                rewardAmount;
            rewardAmount = _amount + remainingRewards;
        }

        require(rewardAmount > 0, "StakingContract: rewardAmount == 0!");
        require(
            rewardAmount <= ichorToken.balanceOf(address(this)),
            "StakingContract: rewardAmount > balance!"
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

    /// @notice Sets new minimal staking period
    /// @param stakingPeriod_ New minimal staking period
    /// @dev This method can be called only by an Owner of the contract
    function setMinimalStakingPeriod(
        uint256 stakingPeriod_
    ) external onlyOwner {
        stakingPeriod = stakingPeriod_;
    }
}
