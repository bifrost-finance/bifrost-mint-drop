// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface IVETH {
    function mint(address account, uint amount) external;
    function burn(address account, uint amount) external;
    function unpause() external;
}
