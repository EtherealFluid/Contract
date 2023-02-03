pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/ISacrificeToken.sol";
//add EnumirableSet

contract StakingContract is Ownable {
    struct Stake {
        address user;
        uint256 stakedAmount;
        uint256 lastTimeStaked;
    }

    constructor (address ichorToken_, address sacrificeToken_, uint256 stakingPeriod_) {
        ichorToken = ichorToken_;
        sacrificeToken = sacrificeToken_;
        stakingPeriod = stakingPeriod_;
    }

    //TODO Add fee free restrictions in ICHOR for staking

    uint256 private totalStaked;
    uint256 private stakingPeriod;

    uint256 private denominator = 100;

    address private ichorToken;
    address private sacrificeToken;

    mapping (address => uint256) private stakedAmount;
    mapping (address => uint256) private timeStakeEnds;

    modifier onlySacrifice {
        require(msg.sender == sacrificeToken, "StakingToken: caller is not sacrifice token!");
        _;
    }

    modifier readyToUnstake {
        require(block.timestamp >= timeStakeEnds[msg.sender], "StakingToken: cant unstake yet!");
        _;
    }

    function getStakedAmount (address user) external returns(uint256) {
        return stakedAmount[user];
    }

    function stake (uint256 amount) external {
        IICHOR(ichorToken).transferFrom(msg.sender, address(this), amount);
        stakedAmount[msg.sender] += amount;
        totalStaked += amount;
        ISacrificeToken(sacrificeToken).mint(msg.sender, amount);
        timeStakeEnds[msg.sender] = block.timestamp + stakingPeriod;
    }


    //TODO ASK WHAT TO DO WITH 15% OF REMAINING TOKENS AFTER PENALTY
    //TODO ASK IF USER CAN STAKE ADDITIONAL TOKENS TO ALREADY STAKED TOKENS.
    function unstake (uint256 amount) external readyToUnstake {
        require(stakedAmount[msg.sender] > 0, "StakingContract: no tokens staked!");
        ISacrificeToken(sacrificeToken).burn(msg.sender, amount);
        if (timeStakeEnds[msg.sender] > block.timestamp) {
            uint256 amountToUnstake = amount - (amount * 15 ) / denominator;
            IICHOR(ichorToken).transfer(msg.sender, amountToUnstake);
        }
        //TODO TRANSFER ICHOR REWARD TOKENS DISTRIBUTED IN REFLECTION MECHANISM

    }

    function setMinimalStakingPeriod (uint256 stakingPeriod_) external onlyOwner {
        stakingPeriod = stakingPeriod_;
    }

    function stakeTransfer(address from, address to, uint256 amount) external onlySacrifice {
        stakedAmount[from] -= amount;
        stakedAmount[to] += amount;
    }

}