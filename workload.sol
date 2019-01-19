pragma solidity ^0.4.0;

contract Workload {
    // The keyword "public" makes those variables
    // readable from outside.
    address public sender;
    mapping (address => uint) public balances;

    // Events allow light clients to react on
    // changes efficiently.
    event Sent(address from, address to, uint amount);

    // This is the constructor whose code is
    // run only when the contract is created.
    function Workload() {
        sender = msg.sender;
        balances[sender] = 1000;
    }

    function send(address to, uint amount) {
        if (balances[msg.sender] < amount) return;
        balances[msg.sender] -= amount;
        balances[to] += amount;
        Sent(msg.sender, to, amount);
    }
}