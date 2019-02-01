pragma solidity >=0.4.0;
contract Voter {

    struct OptionPos {
        uint pos;
        bool exists;
    }
    uint[] public votes;
    string[] public options;
    mapping (address => bool) hasVoted;
    mapping (string => OptionPos) posOfOption;
    bool votingStarted;

    function addOption(string memory option) public {
        require(!votingStarted);
        options.push(option);
    }

    function startVoting() public {
        require(!votingStarted);
        votes.length = options.length;

        for(uint i = 0; i < options.length; i++){
            OptionPos memory option = OptionPos(i, true);
            posOfOption[options[i]] = option;
        }
        votingStarted = true;
    }

    function vote(uint option) public {
        require(0 <= option && option < options.length, "Invalid option!");
        require(!hasVoted[msg.sender], "Already voted!");

        votes[option] = votes[option] +  1;
        hasVoted[msg.sender] = true;
    }

    function vote(string memory optionName) public {
        require(!hasVoted[msg.sender], "Already voted!");
        OptionPos memory optionPos = posOfOption[optionName];
        require(optionPos.exists, "Invalid option!");
        votes[optionPos.pos] = votes[optionPos.pos] +  1;
        hasVoted[msg.sender] = true;
    }

    function getVotes() public view returns ( uint[] memory){
        return votes;
    }
}