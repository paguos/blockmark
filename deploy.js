let fs = require('fs');
let solc = require('solc');
let Web3 = require('web3');

let contract = compileContract();
let web3 = createWeb3();
let sender = "0x6f0f5bcbc463643a4ddbcb6b485bfae7bd419b89";

deployContract(web3, contract, sender)
	.then(function(){
		console.log("Deployment finished")
	})
	.catch(function (error){
		console.log('Failed to deploy contract: ${error}' + error)
	})

function compileContract(){
	let x = fs.readFileSync('Voter.sol', 'utf8');
	let compilerInput = {
		'Voter' : {
            content: fs.readFileSync('Voter.sol', 'utf8')
        }
	};

	console.log('Compiling the contract ...')
	let input = {
		language: 'Solidity',
		sources: compilerInput,
		settings: {
			outputSelection: {
				'*': {
					'*': [ '*' ]
				}
			}
		}
	};
	let compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

	var contract = null;
	console.log('Contract compiled')

	for (var contractName in compiledContract.contracts['Voter']) {
		console.log(contractName + ': ' + compiledContract.contracts['Voter'][contractName])
		contract = compiledContract.contracts['Voter'][contractName];
	}

	return contract;
}

function createWeb3(){
	console.log('Creating web3 ...')
	let web3 = new Web3();
	console.log('Creating web3 ...')
	web3.setProvider(
		new web3.providers.HttpProvider('http://localhost:8545'));
	console.log('Creating web3 ...')
	return web3;

}

async function deployContract(web3, contract, sender){
	console.log('Deploying contract ... ')
	console.log(contract.abi)
	let Voter = new web3.eth.Contract(contract.abi);
	let bytecode = '0x' + contract.evm.bytecode.object;
	console.log('Deploying the contract ...')
	let gasEstimate = await web3.eth.estimateGas({data: bytecode});

	console.log('Deploying the contract ...')

	const contractInstance = await Voter.deploy({
		data: bytecode
	})
	.send({
		from: sender,
		gas: gasEstimate
	})
	.on('transactionHash', function(transactionHash){
		console.log(`Transaction hash: ${transactionHash}`);
	})
	.on('confirmation', function(confirmationNumber, receipt){
		console.log(`Confirmation number: ${confirmationNumber}`);
	})

	console.log(`Contract address: ${contractInstance.options.address}`);

}