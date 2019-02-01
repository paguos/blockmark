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

### Benchmark
To start the benchmark execute the following command:
```sh
node hyperledger-lab/blockmark-code/performTransaction.js
```