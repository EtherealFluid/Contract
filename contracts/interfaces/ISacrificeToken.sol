pragma solidity ^0.8.4;

interface ISacrificeToken {
    function setStakingAddress(address stakingAddress_) external;

    function getStakingAddress(
        address stakingAddress_
    ) external view returns (address);

    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;

    function balanceOf(address user) external view returns (uint256);

    function totalSupply() external view returns (uint256);
    
    function transferOwnership(address newOwner) external;
}
