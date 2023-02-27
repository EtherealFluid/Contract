pragma solidity ^0.8.4;

interface IUnicornToken {
    function getIsUnicorn(address user) external view returns (bool);

    function getAllUnicorns() external view returns (address[] memory);

    function getUnicornsLength() external view returns (uint256);

    function mint(address to) external;

    function burn(address from) external;

    function init(address user) external;

    function transferOwnership(address newOwner) external;
}
