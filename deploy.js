let fs = require('fs');
let solc = require('solc');
let Web3 = require('web3');


main()
	.then(function(){
		console.log("Deployment finished")
	})
	.catch(function (error){
		console.log('Failed to deploy contract: ${error}' + error)
	})

async function main(){
	let contract = compileContract();
	let web3 = createWeb3();
	let sender = "0x6f0f5bcbc463643a4ddbcb6b485bfae7bd419b89";
	let senderPK = '5b2a80252678e85caf702964ce413c34d2db525c6b20fe4ffbeb0b3f4d4f6126';

	await web3.eth.personal.unlockAccount(sender, 'Ed35Dc91')
		.then(console.log('Account unlocked!'));
	let accounts = await generateAccounts(4);
	console.log('Created accounts:')
	console.log(accounts)
	deployContract(web3, contract, sender);
}

function createWeb3(){
	console.log('Connected to the blockchain ...')
	let web3 = new Web3();
	web3.setProvider(
		new web3.providers.HttpProvider('http://localhost:8545'));
	console.log('Connected! ...')
	return web3;
}

function createAccount(web3){
	return web3.eth.accounts.create();
}

async function generateAccount(){

	console.log('Creating account ...')
	let account = createAccount(web3);
	console.log('Account created!')

	console.log('Signing transaction ...')
	let transaction = await web3.eth.signTransaction({
		from: sender,
		to: account.address,
		value: '100000000',
		gas: 2000000
	}, 'Ed35Dc91')
	console.log('Transaction signed!')

	console.log('Sending transaction ...')
	web3.eth.sendSignedTransaction(transaction.raw)
		.then(receipt => console.log('Transaction send!'))
		.catch(err => console.error('Error while sending a transaction: ' + err));

	return {'account' : account.address, 'privateKey' : account.privateKey}
}

async function generateAccounts(numb){
	var accounts = []
	while(numb > 0){
		var account = await generateAccount();
		accounts.push(account)
		numb--;
	}
	return accounts
}

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
		console.log(`Receipt:`);
		console.log(receipt);
	})

	console.log(`Contract address: ${contractInstance.options.address}`);

}