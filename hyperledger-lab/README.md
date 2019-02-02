# Setting Up Hyperledger Fabric

This repository is based on [Fabric Samples](https://github.com/hyperledger/fabric-samples) repo provided by IBM.

* Execute the `byfn.sh generate` with command in the first-network directory. This will create relevant certificates for each Organization & orderer.
* Execute `byfn.sh up -l node -f docker-compose-e2e.yaml` , this will deploy the chaincode in *chaincode/blockmark/node* . After successfull execution of the command. 
* In the *blockmark-code* directory first execute `node enrollAdmin.js` , followed by `node registerUser.js` .
* After that execute `node query.js` to query the blockchain & `node performTransaction.js` to invoke transactions and generate csv.

### Configuring Fabric Explorer 

![Fabric Explorer](//i.imgur.com/VIChXCr.png)

To setup blockchain explorer modify the `config.json` with using `fabric-explorer.config.template.json` as a baseline. 

* Navigate to `fabric-explorer/blockchain-explorer/app/persistence/fabric/postgreSQL/db/` and execute `createdb.sh`
* Execute `fabric-explorer/blockchain-explorer/start.sh`
* Open `localhost:8080` in browser.


