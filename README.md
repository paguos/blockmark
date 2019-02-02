# blockmark
An experimental benchmark for blockchain transcations

## Ethereum

### Requirements
- [Geth Go Client v1.8.6](https://geth.ethereum.org/downloads/)
- [Python 3.5+](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/en/)

### Network Setup

Install the Node.js dependecies:
```sh
npm install
```
Setup the etherum network using the cli:
```sh
node blockmark.js setup ethereum
```

or using the python script:
```sh
python setup_ethereum.py
```

### Benchmark
Run the benchmark using the following command:
Setup the etherum network using the cli:
```sh
node blockmark.js run ethereum
```
Once the benchmark is finalized you fill find the obtained results in the `blockmark_ethereum_<current_timestamp>.csv` file.

=======
## Hyperledger
![Hyperledger Fabric](https://hyperledger-fabric.readthedocs.io/en/latest/_images/hyperledger_fabric_logo_color.png)

### Requirements
Make sure that you have all the requirements listed in the [official website](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html) before continuing.

### Network Setup
First create relevant certificates for each organization and orderer with the following command:
```sh
hyperledger-lab/first-network/byfn.sh generate
```
Deploy the chaincode of the directory `chaincode/blockmark/node`:
```sh
hyperledger-lab/first-network/byfn.sh up -l node -f docker-compose-e2e.yaml
```

Provide the network with the necessary resources:
```sh
node hyperledger-lab/blockmark-code/enrollAdmin.js
node hyperledger-lab/blockmark-code/registerUser.js
node hyperledger-lab/blockmark-code/query.js
```
### Setting Up Hyperledger Fabric

This repository is based on [Fabric Samples](https://github.com/hyperledger/fabric-samples) repo provided by IBM.

* Execute the `byfn.sh generate` with command in the first-network directory. This will create relevant certificates for each Organization & orderer.
* Execute `byfn.sh up -l node -f docker-compose-e2e.yaml` , this will deploy the chaincode in *chaincode/blockmark/node* . After successfull execution of the command. 
* In the *blockmark-code* directory first execute `node enrollAdmin.js` , followed by `node registerUser.js` .
* After that execute `node query.js` to query the blockchain & `node performTransaction.js` to invoke transactions and generate csv.
* Execute `./generateStats.sh` to perform 100 transactions. This will generate a file *latency_stats.csv* which contains timestamps for each event.

### Configuring Fabric Explorer 

![Fabric Explorer](https://i.imgur.com/VIChXCr.png)

To setup blockchain explorer modify the `config.json` with using `fabric-explorer.config.template.json` as a baseline. 

* Navigate to `fabric-explorer/blockchain-explorer/app/persistence/fabric/postgreSQL/db/` and execute `createdb.sh`
* Execute `fabric-explorer/blockchain-explorer/start.sh`
* Open `localhost:8080` in browser.

### Benchmark
To start the benchmark execute the following command:
```sh
node hyperledger-lab/blockmark-code/performTransaction.js
```
