'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');
var fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;  
const csvWriter = createCsvWriter({  
  path: 'latency_stats.csv',
  header: [
    {id: 'txid', title: 'TransactionID'},
    {id: 'peerId', title: 'Peer'},
    {id: 'event', title: 'Event'},
    {id: 'time', title: 'Time'},
  ],
  append: true
});

let csv_data = [], tx_submission_time = null;

let basePath = "../first-network/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/";
let serverCert = fs.readFileSync(basePath + 'msp/tlscacerts/tlsca.org1.example.com-cert.pem');
let clientKey = fs.readFileSync(basePath + 'tls/client.key');
let clientCert = fs.readFileSync(basePath + 'tls/client.crt');

let ordererCert = fs.readFileSync("../first-network/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem");
let peer1Org1Cert = fs.readFileSync("../first-network/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem");
let peer0Org2Cert = fs.readFileSync("../first-network/crypto-config/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/tlscacerts/tlsca.org2.example.com-cert.pem");

let tx_timeout = 10000;
//
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('mychannel');

let peer0Org1 = fabric_client.newPeer('grpcs://localhost:7051', {
    'pem': Buffer.from(serverCert).toString(),
    'ssl-target-name-override': 'peer0.org1.example.com',
    'grpc.keepalive_timeout_ms': 10000
});
channel.addPeer(peer0Org1);

let peer1Org1 = fabric_client.newPeer('grpcs://localhost:8051', {
    'pem': Buffer.from(peer1Org1Cert).toString(),
    'ssl-target-name-override': 'peer1.org1.example.com',
    'grpc.keepalive_timeout_ms': 10000
});
channel.addPeer(peer1Org1);

let peer0Org2 = fabric_client.newPeer('grpcs://localhost:9051', {
    'pem': Buffer.from(peer0Org2Cert).toString(),
    'ssl-target-name-override': 'peer0.org2.example.com',
    'grpc.keepalive_timeout_ms': 10000
});
channel.addPeer(peer0Org2);

let peer1Org2 = fabric_client.newPeer('grpcs://localhost:10051', {
    'pem': Buffer.from(peer0Org2Cert).toString(),
    'ssl-target-name-override': 'peer1.org2.example.com',
    'grpc.keepalive_timeout_ms': 10000
});
channel.addPeer(peer1Org2);

var order = fabric_client.newOrderer('grpcs://localhost:7050', {
    'pem': Buffer.from(ordererCert).toString(),
    'ssl-target-name-override': 'orderer.example.com',
    'grpc.keepalive_timeout_ms': 10000
})
channel.addOrderer(order);

//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('user1', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded user1 from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get user1.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
	// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
	// must send the proposal to endorsing peers
	var request = {
		//targets: let default to the peer assigned to the client
		chaincodeId: 'blockmark',
        fcn: 'transferBalance',
        args: ['001','100','2'],
		chainId: 'mychannel',
		txId: tx_id
	};

	// send the transaction proposal to the peers
	tx_submission_time = Date.now().toPrecision().toString();
	return channel.sendTransactionProposal(request);
}).then((results) => {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		csv_data.push({
			'txid': transaction_id_string,
			'peerId': "N/A",
			'event': 'PROPOSAL_SUBMISSION',
			'time': tx_submission_time
		});

		csv_data.push({
			'txid': transaction_id_string,
			'peerId': "N/A",
			'event': 'PROPOSAL_ACCEPTED',
			'time': Date.now().toPrecision().toString()
		});

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
        let event_hub_peer0_org1 = channel.newChannelEventHub(peer0Org1);
        let event_hub_peer1_org1 = channel.newChannelEventHub(peer1Org1);
        let event_hub_peer0_org2 = channel.newChannelEventHub(peer0Org2);
        let event_hub_peer1_org2 = channel.newChannelEventHub(peer1Org2);

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise_peer0_org1 = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub_peer0_org1.unregisterTxEvent(transaction_id_string);
				event_hub_peer0_org1.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, tx_timeout);
			event_hub_peer0_org1.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					csv_data.push({
						'txid': transaction_id_string,
						'peerId': "peer0.org1.example.com",
						'event': 'COMMITTED',
						'time': Date.now().toPrecision().toString()
					});
					console.log(Date.now().toPrecision().toString(), ' The transaction has been committed on peer ' + event_hub_peer0_org1.getPeerAddr());
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			},
				{disconnect: true} //disconnect when complete
			);
			event_hub_peer0_org1.connect();

        });
        
		let txPromise_peer1_org1 = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub_peer1_org1.unregisterTxEvent(transaction_id_string);
				event_hub_peer1_org1.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, tx_timeout);
			event_hub_peer1_org1.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					csv_data.push({
						'txid': transaction_id_string,
						'peerId': "peer1.org1.example.com",
						'event': 'COMMITTED',
						'time': Date.now().toPrecision().toString()
					});
					console.log(Date.now().toPrecision().toString(), ' The transaction has been committed on peer ' + event_hub_peer1_org1.getPeerAddr());
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			},
				{disconnect: true} //disconnect when complete
			);
			event_hub_peer1_org1.connect();

        });

        let txPromise_peer0_org2 = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub_peer0_org2.unregisterTxEvent(transaction_id_string);
				event_hub_peer0_org2.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, tx_timeout);
			event_hub_peer0_org2.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					csv_data.push({
						'txid': transaction_id_string,
						'peerId': "peer0.org2.example.com",
						'event': 'COMMITTED',
						'time': Date.now().toPrecision().toString()
					});
					console.log(Date.now().toPrecision().toString(), ' The transaction has been committed on peer ' + event_hub_peer0_org2.getPeerAddr());
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			},
				{disconnect: true} //disconnect when complete
			);
			event_hub_peer0_org2.connect();

        });

        let txPromise_peer1_org2 = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub_peer1_org2.unregisterTxEvent(transaction_id_string);
				event_hub_peer1_org2.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, tx_timeout);
			event_hub_peer1_org2.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					csv_data.push({
						'txid': transaction_id_string,
						'peerId': "peer1.org2.example.com",
						'event': 'COMMITTED',
						'time': Date.now().toPrecision().toString()
					});
					console.log(Date.now().toPrecision().toString(), ' The transaction has been committed on peer ' + event_hub_peer1_org2.getPeerAddr());
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			},
				{disconnect: true} //disconnect when complete
			);
			event_hub_peer1_org2.connect();

        });


        promises.push(txPromise_peer0_org1);
        promises.push(txPromise_peer1_org1);
        promises.push(txPromise_peer0_org2);
        promises.push(txPromise_peer1_org2);

		return Promise.all(promises);
	} else {
		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + results[0].status);
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
		csvWriter.writeRecords(csv_data).then(() => console.log('The CSV file was written successfully'));
	} else {		
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err);
});