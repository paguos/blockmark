#!/usr/bin/env node

var program = require('commander');
let fs = require('fs');
let Web3 = require('web3');
let date = new Date().toISOString()

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: `blockmark_ethereum_${date}.csv`,
    header: [
        {id: 'id', title: 'ID'},
        {id: 'time', title: 'TIME'}
    ]
});

const records = [];

program
  .command('setup <technology>')
  .action(function (technology) {
      switch (technology){
        case 'ethereum':
            setupEthereum();
            break;
        case 'hyperledger':
            break;
        default:
            console.log('Please enter a valid option')
            break;
      }
  });
program
  .command('run <technology>')
  .action(function (technology) {
      switch (technology){
        case 'ethereum':
            benchmark_ethereum();
            break;
        case 'hyperledger':
            break;
        default:
            console.log('Please enter a valid option')
            break;
      }
  });

program.parse(process.argv)

function setupEthereum(){
    const{ spawn } = require( 'child_process' ),
    ls = spawn('python', ['setup_ethreum.py']);

    ls.stdout.on( 'data', data => {
        console.log( `stdout: ${data}` );
    } );

    ls.stderr.on( 'data', data => {
        console.log( `stderr: ${data}` );
    } );

    ls.on( 'close', code => {
        console.log( `child process exited with code ${code}` );
    } );
}

function getWeb3(port){
    console.log(`Getting web3 provider 'http://localhost:${port}' ...`)
	let web3 = new Web3();
	web3.setProvider(
		new web3.providers.HttpProvider(`http://localhost:${port}`));
	return web3;
}


function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
}

async function sendEther(web3, to, from, amount){
    let transaction_hash = await web3.eth.personal.sendTransaction({
        from: to,
        to: from,
        value: web3.utils.toWei(amount, 'ether'),
        data: ""
    }, 'blockmark')
    return transaction_hash
}

async function warmUp(web3_s, sender, web3_r, receiver){
    console.log("Start warm up ...")
    rounds = 3
    while(rounds > 0){
        let t1 = await sendEther(web3_s, sender, receiver, '2')
        var receipt = null
        while(receipt == null){
            receipt = await web3_r.eth.getTransactionReceipt(t1)
        }
        let t2 = await sendEther(web3_r, receiver, sender, '1')
        var receipt = null
        while(receipt == null){
            receipt = await web3_s.eth.getTransactionReceipt(t2 )
        }
        rounds--;
    }
    sleep(1000)
    console.log("Warm up complete!")
}

async function benchmark_ethereum(){
    let sender = getWeb3(8546);
    let receiver = getWeb3(8547);
    count = 1
    let sender_account = (await sender.eth.personal.getAccounts())[0];
    let receiver_account = (await receiver.eth.personal.getAccounts())[0];

    await warmUp(sender, sender_account, receiver, receiver_account)

    console.log("Starting ethereum benchmark ...")
    while(count <= 100){
        console.log(`Starting transaction #${count}...`)
        start = Date.now()
        let transaction_hash = await sendEther(sender, sender_account, receiver_account, '1')
        console.log("Transaction send!")
        console.log("Waiting for receipt ...")
        var receipt = null
        while(receipt == null){
            receipt = await receiver.eth.getTransactionReceipt(transaction_hash)
        }
        end = Date.now()
        time = end - start
        console.log(`Transaction #${count} completed: ${time} ms`)
        records.push({id: count, time: time})
        sleep(1000)
        count++;
    }

    csvWriter.writeRecords(records)       // returns a promise
    .then(() => {
        console.log('...Done');
    });
}



