pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStakingContract.sol";

contract SacrificeToken is ERC20, Ownable{

    //mapping(address => uint256) private _balances;

    address private stakingAddress;

    constructor(string memory name_, string memory symbol_, address stakingAddress_) ERC20(name_, symbol_) {
        stakingAddress = stakingAddress_;
    }

    modifier onlyStaking{
        require(msg.sender == stakingAddress, "SacrificeToken: caller is not a StakingContract!");
        _;
    }

    function mint (address to, uint256 amount) external onlyStaking {
        _mint(to, amount);
    }

    function burn (address from, uint256 amount) external onlyStaking {
        _burn(from, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(IStakingContract(stakingAddress).getTimeStakeEnds(from) <= block.timestamp, "SacrificeToken: stake period does not end!"); 
        super._transfer(from, to, amount);
    }
}