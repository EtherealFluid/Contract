// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStakingContract.sol";

/// @notice Reward token contract
contract SacrificeToken is ERC20, Ownable {
    /// @notice Address of the StakingContract
    address private stakingAddress;

    /// @param name_ Name of the token
    /// @param symbol_ Symbol of the token
    /// @param stakingAddress_ Address of the StakingContract
    constructor(
        string memory name_,
        string memory symbol_,
        address stakingAddress_
    ) ERC20(name_, symbol_) {
        stakingAddress = stakingAddress_;
    }

    /// @notice Checks if caller is a StakingConrtact
    modifier onlyStaking() {
        require(
            msg.sender == stakingAddress,
            "SacrificeToken: caller is not a StakingContract!"
        );
        _;
    }

    /// @notice Mints tokens to targeted account
    /// @param to Targeted account
    /// @param amount Amount of tokens to mint
    /// @dev This method can be called only by a StakingContract
    function mint(address to, uint256 amount) external onlyStaking {
        _mint(to, amount);
    }

    /// @notice Burns tokens from targeted account
    /// @param from Targeted account
    /// @param amount Amount of tokens to burn
    /// @dev This method can be called only by a StakingContract
    function burn(address from, uint256 amount) external onlyStaking {
        _burn(from, amount);
    }

    /// @notice Transfers tokens from spender to targeted account
    /// @param from Sender of tokens
    /// @param to Recipient of tokens
    /// @param amount Amount of tokens to transfer
    /// @dev This is a internal method. Checks if stake time is over for spender
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(
            IStakingContract(stakingAddress).getTimeStakeEnds(from) <=
                block.timestamp,
            "SacrificeToken: stake period does not end!"
        );
        super._transfer(from, to, amount);
    }
}
