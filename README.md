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
