// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/// @title Contract used to buy RPVTokens
/// @notice RPVtokens is used to buy the VotingTokens
contract RPVSale is Ownable {
    using SafeMath for uint256;

    /// @return rate Rates for the purchase of tokens
    uint256 public rate;

    /// @return rpvToken Address of RPVToken
    IERC20 public rpvToken;

    /// @return incomeSales Amount of money received from the sale of RPVTokens
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

    /// @notice buyTokens method carries out the purchase of PRVTokens
    /// @param _beneficiary Token recipient address
    function buyTokens(address _beneficiary) public payable {
        require(_beneficiary != address(0), 'RPTSale: address == address(0)');
        require(msg.value > 0, 'RPTSale: msg.value == 0');
        require(msg.value % rate == 0, 'RPTSale: Incorrect msg.value');
        uint256 tokenAmount = SafeMath.div(msg.value, rate);
        require(tokenAmount * 10 ** 18 <= rpvToken.balanceOf(address(this)), 'RPTSale: Not enough RPT');
        incomeSales = incomeSales.add(msg.value);
        rpvToken.transfer(_beneficiary, tokenAmount * 10 ** 18);
    }

    /// @return wallet Address of the wallet that accepts money for the purchase of PRVTokens
    function getWallet() external view onlyOwner returns (address) {
        return wallet;
    }

    /// @notice Sets the address of the wallet that accepts money for the purchase of PRVTokens
    /// @param _newWallet New address of the wallet that accepts money for the purchase of PRVTokens
    function setWallet(address payable _newWallet) external onlyOwner {
        require(_newWallet != address(0), 'RPTSale: wallet == address(0)');
        emit SetWallet(wallet, _newWallet);
        wallet = _newWallet;
    }

    /// @notice Sets rates for purchasing of PRVTokens
    /// @param _newRate New rate for purchasing of PRVTokens
    function setRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, 'RPTSale: rate == 0');
        emit SetRate(rate, _newRate);
        rate = _newRate;
    }

    /// @notice Sets tRPVToken's address
    /// @param _newToken New tRPVToken's address
    function setToken(IERC20 _newToken) external onlyOwner {
        require(address(_newToken) != address(0), 'RPTSale: token == address(0)');
        emit SetToken(rpvToken, _newToken);
        rpvToken = _newToken;
    }
}
