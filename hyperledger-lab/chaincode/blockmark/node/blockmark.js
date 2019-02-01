/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

/*
peer chaincode invoke -o orderer.example.com:7050 --tls true --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n blockmark --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"transferBalance","Args":["001","100","1"]}'
*/

'use strict';
const shim = require('fabric-shim');
const util = require('util');

let Chaincode = class {

  // The Init method is called when the Smart Contract 'blockmark' is instantiated by the blockchain network
  // Best practice is to have any Ledger initialization in separate function -- see initLedger()
  async Init(stub) {
    console.info('=========== Instantiated blockmark chaincode ===========');
    return shim.success();
  }

  // The Invoke method is called as a result of an application request to run the Smart Contract
  // 'blockmark'. The calling application program has also specified the particular smart contract
  // function to be called, with arguments
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async queryAccount(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting accountID ex: 100');
    }
    let accountID = args[0];

    let accountAsBytes = await stub.getState(accountID); //get the car from chaincode state
    if (!accountAsBytes || accountAsBytes.toString().length <= 0) {
      throw new Error(accountID + ' does not exist: ');
    }
    console.log(accountAsBytes.toString());
    return accountAsBytes;
  }

  async initLedger(stub, args) {
    console.info('============= START : Initialize Ledger ===========');
    let accounts = [];
    accounts.push({
      id: '001',
	  name: 'Receiver',
	  balance: 1000
    });
    accounts.push({
      id: '100',
	  name: 'Sender01',
	  balance: 1000
    });
    accounts.push({
      id: '200',
	  name: 'Sender02',
	  balance: 2000
    });
    accounts.push({
      id: '300',
	  name: 'Sender03',
	  balance: 2000
    });

    for (let i = 0; i < accounts.length; i++) {
      accounts[i].docType = 'account';
      await stub.putState(accounts[i]['id'], Buffer.from(JSON.stringify(accounts[i])));
      console.info('Added <--> ', accounts[i]['name'], 'ID: ', accounts[i]['id']);
    }
    console.info('============= END : Initialize Ledger ===========');
  }

  async createAccount(stub, args) {
    console.info('============= START : Create New Account ===========');
    if (args.length != 4) {
      throw new Error('Incorrect number of arguments. Expecting 4');
    }

    var account = {
      docType: 'account',
      id: args[1],
      name: args[2],
      balance: args[3]
    };

    await stub.putState(args[0], Buffer.from(JSON.stringify(account)));
    console.info('============= END : Create New Account ===========');
  }

  async queryAllAccounts(stub, args) {

    let startKey = '000';
    let endKey = '999';

    let iterator = await stub.getStateByRange(startKey, endKey);

    let allResults = [];
    while (true) {
      let res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;
        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await iterator.close();
        console.info(allResults);
        return Buffer.from(JSON.stringify(allResults));
      }
    }
  }

  async transferBalance(stub, args) {
    console.info('============= START : transferBalance ===========');
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3. (Sender ID, Receiver ID, Amount)');
    }
	
	let fromAsBytes = await stub.getState(args[0]);
	let from = JSON.parse(fromAsBytes.toString());

	console.log(" FROM: \t", from);

	let toAsBytes = await stub.getState(args[1]);
	let to = JSON.parse(toAsBytes.toString());

	console.log(" TO: \t", to);

	let amount = parseInt(args[2]);

    if(from.balance < amount){
		console.info('Balance is insufficient');
	} else {
		from.balance = parseInt(from.balance) - amount;
		to.balance = parseInt(to.balance) + amount;

		console.log(" UPDATED TO: \t", to);

		await stub.putState(args[0], Buffer.from(JSON.stringify(from)));
		await stub.putState(args[1], Buffer.from(JSON.stringify(to)));
	}
  
    console.info('============= END : transferBalance ===========');
  }
};

shim.start(new Chaincode());
