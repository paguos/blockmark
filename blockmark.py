import threading, os, subprocess
import atexit, signal
import requests, time, json
from web3 import Web3

eth_proceses = []
init_balance = "0x200000000000000000000000000000000000000000000000000000000000000"

def kill_nodes():
  print("Stoping nodes ...")
  for pid in eth_proceses:
      os.killpg(os.getpgid(pid), signal.SIGTERM)

def delete_nodes():
  '''Deletes all the node files '''
  print("Deleting nodes ...")
  subprocess.check_output(['rm', '-r','ethereum/nodes'])

class EthereumNodeThread(threading.Thread):

  def __init__(self, account_address=None):
    self.account_address = account_address 
    super(EthereumNodeThread, self).__init__()

  def run(self, node_numb, port, rpcport):
      print("{} started!".format(self.getName()))
      args = ['geth', '--datadir', f'ethereum/nodes/node_{node_numb}',
            '--networkid', '8888','--nodiscover' ,'--port', f'{port}', '--rpc', '--rpcport', f'{rpcport}',
            '--rpcapi', 'admin,personal,db,eth,net,web3,txpool, mine','--mine', '--verbosity', "0"]

      if self.account_address != None:
        args.extend(['--unlock', self.account_address])
        args.extend(['--password', 'ethereum/password.txt'])

      p = subprocess.Popen(args)
      eth_proceses.append(p.pid)

class EthereumBlockmark():

  genesis_path = 'ethereum/genesis.json'

  def __init__(self, peers, port, rpcport):
    self.peers = peers
    self.port = port
    self.rpcport = rpcport
    self.accounts = {}

  def init_nodes(self):
    for p in range(0, self.peers):
      print(f"Creating node #{p} ...")
      print(subprocess.check_output(['geth', '--datadir',
              f'ethereum/nodes/node_{p}' ,'init', 'ethereum/genesis.json']))

  def start_nodes(self):
      print("Staring nodes ...")
      for p in range(0, self.peers):
        print(f"Starting node #{p} ...")
        thread = EthereumNodeThread()
        if p in self.accounts:
          thread.account_address = self.accounts[p]
        thread.run(p, self.port + p, self.rpcport + p)
        print(f"Node #{p} started!")

  def get_enode_from_node(self, rpcport):
    print(f"Getting endo from node #{rpcport}")
    r = requests.post(f"http://localhost:{rpcport}",
                        json={"jsonrpc":"2.0","method":"admin_nodeInfo", "params":[],"id":74})
    data = json.loads(r.text)
    return data["result"]["enode"]

  def add_peer(self, enode):
    print(f"Adding peer to node with port {self.rpcport} ...")
    r = requests.post(f"http://localhost:{self.rpcport}",
                        json={"jsonrpc":"2.0","method":"admin_addPeer", "params":[enode],"id":75})
    data = json.loads(r.text)

  def get_rpc_ports(self):
    return [self.rpcport + p for p in range(0, self.peers)]

  def get_enodes(self):
    return [self.get_enode_from_node(port) for port in self.get_rpc_ports()]

  def setup_accounts(self):
    print("Seting up accounts ...")
    for p in range(0, self.peers):
      self.create_account(p)

  def create_account(self, node_numb):
    print(f"Creating account for node #{node_numb} ...")
    account_address = subprocess.check_output(['geth', '--datadir',
            f'ethereum/nodes/node_{node_numb}' ,'account', 'new', '--password', 'ethereum/password.txt']).decode('utf-8')
    self.accounts[node_numb] = account_address[10:-2]

  def setup_genesis(self):
    print("Seting up genesis file ... ")
    founds = { self.accounts[n] : {"balance" : init_balance} for n in list(self.accounts)[:2]}
    self.config_genesis("alloc", founds)

  def read_genesis(self):
    with open(self.genesis_path) as genesis_file:
      return json.load(genesis_file)

  def config_genesis(self, key, value):
    data = self.read_genesis()
    data[key] = value
    with open(self.genesis_path, 'w') as outfile:
      json.dump(data, outfile, indent=4)

if __name__ == "__main__":
  atexit.register(kill_nodes)
  atexit.register(delete_nodes)
  blockmark = EthereumBlockmark(5, 34044, 7000)
  blockmark.setup_accounts()
  blockmark.setup_genesis()
  blockmark.init_nodes()
  blockmark.start_nodes()
  time.sleep(1)

  for enode in blockmark.get_enodes()[1:]:
    blockmark.add_peer(enode)

  web3 = Web3(Web3.HTTPProvider(f"http://127.0.0.1:{blockmark.rpcport}"))

  print("Waiting ...")
  time.sleep(5)
  print("Continue ...")
  trans_hash = web3.eth.sendTransaction({"from": web3.toChecksumAddress(f'0x{blockmark.accounts[0]}'), "to": web3.toChecksumAddress(f'0x{blockmark.accounts[3]}'), "value": web3.toWei(10000, "ether")})
  trans_hash.hex()
  #eth.sendTransaction({from: "0xc89c11c0a4d3a6f1bc7b2e2eca95433518c149d1", to: "0xcd0b7128fd80ba517080c3f06ef0d5bcefd1a7b4", value: web3.toWei(10000, "ether")})
  #{0: 'd3f5acdbc96bc9b17cf429d6e3c6fa78ed69827e', 1: '1d4d2f8cbf07321950bc0331c4790022a512a5b4'}
  print(blockmark.accounts)

  animation = "|/-\\"
  idx = 0
  while(True):
    print("Ethereum running " + animation[idx % len(animation)], end="\r")
    idx += 1
    time.sleep(0.2)