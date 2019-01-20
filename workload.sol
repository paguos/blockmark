pragma solidity >=0.4.0 <0.6.0; // Tested and compiled using 0.5.2

contract Workload {

    //address payable public sender;
    address payable public receiver;
    
    constructor(address payable _receiver) public payable{
        receiver = _receiver;
    }
    
    event Sent();
    
    // Get balance of a specified address
    function getBalance(address _from) public view returns (uint256) {
        return address(_from).balance;
    }
    
    function getSender() public view returns (address){
        return address(msg.sender);
    }

    // Send money to receiver address
    function send(uint amount) public payable {
        address payable sender = msg.sender;
        require(amount <= sender.balance, "Insufficient balance.");
        sender.transfer(amount);
        //receiver.transfer(address(this).balance);
        emit Sent();
    }
}