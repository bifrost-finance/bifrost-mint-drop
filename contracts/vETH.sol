// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract vETH is ERC20, Ownable {

    constructor() public ERC20("Voucher Ethereum", "vETH") Ownable() {}

    function mint(address account, uint amount) external onlyOwner {
        super._mint(account, amount);
    }

    function burn(address account, uint amount) external onlyOwner {
        super._burn(account, amount);
    }
}
