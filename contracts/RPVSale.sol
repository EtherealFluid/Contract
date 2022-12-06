// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract RPVSale is Ownable {
    using SafeMath for uint256;

    uint256 public rate;
    IERC20 public rpvToken;
    uint256 public incomeSales;

    address payable private wallet;

    event SetRate(uint256 indexed previous, uint256 indexed set);
    event SetWallet(address indexed previous, address indexed set);
    event SetToken(IERC20 indexed previous, IERC20 indexed set);

    constructor(uint256 _rate, address payable _wallet) {
        require(_rate > 0, 'RPTSale: rate == 0');
        require(_wallet != address(0), 'RPTSale: wallet == address(0)');
        rate = _rate;
        wallet = _wallet;
    }

    receive() external payable {
        buyTokens(_msgSender());
    }

    function buyTokens(address _beneficiary) public payable {
        require(_beneficiary != address(0), 'RPTSale: address == address(0)');
        require(msg.value > 0, 'RPTSale: msg.value == 0');
        require(msg.value % rate == 0, 'RPTSale: Incorrect msg.value');
        uint256 tokenAmount = SafeMath.div(msg.value, rate);
        require(tokenAmount * 10 ** 18 <= rpvToken.balanceOf(address(this)), 'RPTSale: Not enough RPT');
        incomeSales = incomeSales.add(msg.value);
        rpvToken.transfer(_beneficiary, tokenAmount * 10 ** 18);
    }

    function getWallet() external view onlyOwner returns (address) {
        return wallet;
    }

    function setWallet(address payable _newWallet) external onlyOwner {
        require(_newWallet != address(0), 'RPTSale: wallet == address(0)');
        emit SetWallet(wallet, _newWallet);
        wallet = _newWallet;
    }

    function setRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, 'RPTSale: rate == 0');
        emit SetRate(rate, _newRate);
        rate = _newRate;
    }

    function setToken(IERC20 _newToken) external onlyOwner {
        require(address(_newToken) != address(0), 'RPTSale: token == address(0)');
        emit SetToken(rpvToken, _newToken);
        rpvToken = _newToken;
    }
}
