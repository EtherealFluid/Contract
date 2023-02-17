pragma solidity ^0.8.4;

interface IICHOR {

    function name() external returns (string memory);

    function symbol() external returns (string memory);

    function decimals() external returns (uint8);

    function totalSupply() external returns (uint256);

    function balanceOf(address account) external returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function setCooldownEnabled(bool onoff) external;

    function setSwapEnabled(bool onoff) external;

    function openTrading() external;
    
    function setBots(address[] memory bots_) external;

    function setMaxBuyAmount(uint256 maxBuy) external;

    function setMaxSellAmount(uint256 maxSell) external;
    
    function setMaxWalletAmount(uint256 maxToken) external;
    
    function setSwapTokensAtAmount(uint256 newAmount) external;

    function setProjectWallet(address projectWallet) external;

    function setCharityAddress(address charityAddress) external;

    function getCharityAddress() external view returns (address charityAddress);

    function excludeFromFee(address account) external;
    
    function includeInFee(address account) external;

    function setBuyFee(uint256 buyProjectFee) external;

    function setSellFee(uint256 sellProjectFee) external;

    function setBlocksToBlacklist(uint256 blocks) external;

    function delBot(address notbot) external;

    function manualswap() external;
    
    function withdrawStuckETH() external;
}