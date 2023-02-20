pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract mockERC20 is ERC20{
    constructor() ERC20("Mock", "MK") {
        
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}