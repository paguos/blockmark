'''Simple script to set up a local ethereum network '''

import threading, os, subprocess
import atexit, signal
import requests, time, json
from web3 import Web3

eth_proceses = []
init_balance = "0x200000000000000000000000000000000000000000000000000000000000000"

def kill_nodes():
  '''Stops the nodes subprocesses'''
  print("Stoping nodes ...")
  for pid in eth_proceses:
      os.killpg(os.getpgid(pid), signal.SIGTERM)

def delete_nodes():
  '''Deletes all the node files '''
  print("Deleting nodes ...")
  subprocess.check_output(['rm', '-r','ethereum/nodes'])

class EthereumNodeThread(threading.Thread):
  '''Handle a node subprocess '''

  def __init__(self, miner=True,account_address=None):
    self.miner = miner
    self.account_address = account_address
    super(EthereumNodeThread, self).__init__()

  def run(self, node_name, port, rpcport):
      print("{} started!".format(self.getName()))
      args = ['geth', '--datadir', f'ethereum/nodes/{node_name}',
            '--networkid', '8888','--nodiscover' ,'--port', f'{port}', '--rpc', '--rpcport', f'{rpcport}',
            '--rpcapi', 'admin,personal,db,eth,net,web3,txpool, mine', '--verbosity', "0"]

      if self.account_address != None:
        args.extend(['--unlock', self.account_address])
        args.extend(['--password', 'ethereum/password.txt'])

      if self.miner:
        args.append('--mine')

      p = subprocess.Popen(args)
      eth_proceses.append(p.pid)

class EthereumNetwork():
  ''' Handle the ethereum network '''
  genesis_path = 'ethereum/genesis.json'
  main_nodes = ['main', 'sender', 'receiver']
  nodes_count = 0

  def __init__(self, peers, port, rpcport):
    self.peers = peers
    self.port = port
    self.rpcport = rpcport
    self.accounts = {}
    self.setup_accounts()
    self.setup_genesis()
    self.init_nodes()
    self.start_nodes()
    self.start_miners()

    time.sleep(1) # Waits for network to be ready

    for enode in self.get_enodes()[1:]:
      self.add_peer(enode)

  def init_nodes(self):
    self.init_main_node()
    self.init_sender_node()
    self.init_receiver_node()
    for p in range(0, self.peers):
      print(f"Creating node #{p} ...")
      print(subprocess.check_output(['geth', '--datadir',
              f'ethereum/nodes/node_{p}' ,'init', 'ethereum/genesis.json']))

  def init_sender_node(self):
    print('Initializing sender node ....')
    print(subprocess.check_output(['geth', '--datadir',
              f'ethereum/nodes/sender' ,'init', 'ethereum/genesis.json']))

  def init_receiver_node(self):
    print('Initializing receiver node ....')
    print(subprocess.check_output(['geth', '--datadir',
          f'ethereum/nodes/receiver' ,'init', 'ethereum/genesis.json']))

  def init_main_node(self):
    print('Initializing main node ...')
    print(subprocess.check_output(['geth', '--datadir',
          f'ethereum/nodes/main' ,'init', 'ethereum/genesis.json']))

  def start_nodes(self):
    print("Starting main nodes ...")
    for node in self.main_nodes:
      thread = EthereumNodeThread(miner=False)
      thread.run(node, self.port + self.nodes_count, self.rpcport + self.nodes_count)
      self.nodes_count = self.nodes_count + 1

  def start_miners(self):
    print("Staring miner nodes ...")
    for p in range(0, self.peers):
      print(f"Starting node #{p} ...")
      thread = EthereumNodeThread()
      if p in self.accounts:
        thread.account_address = self.accounts[p]
      thread.run(f"node_{p}", self.port + self.nodes_count, self.rpcport + self.nodes_count)
      self.nodes_count = self.nodes_count + 1
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
    return [self.rpcport + c for c in range(0, self.nodes_count)]

  def get_enodes(self):
    return [self.get_enode_from_node(port) for port in self.get_rpc_ports()]

  def setup_accounts(self):
    print("Seting up accounts ...")
    for p in range(0, self.peers):
      self.create_account(f"node_{p}")

    for node in self.main_nodes:
      self.create_account(node)

  def create_account(self, node_name):
    print(f"Creating account for #{node_name} ...")
    account_address = subprocess.check_output(['geth', '--datadir',
            f'ethereum/nodes/{node_name}' ,'account', 'new', '--password', 'ethereum/password.txt']).decode('utf-8')
    self.accounts[node_name] = account_address[10:-2]

  def setup_genesis(self):
    print("Seting up genesis file ... ")
    founds = { self.accounts["sender"] : {"balance" : init_balance}}
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
  blockmark = EthereumNetwork(2, 34044, 7000)

  animation = "|/-\\"
  idx = 0
  while(True):
    print("Ethereum running " + animation[idx % len(animation)], end="\r")
    idx += 1
    time.sleep(0.2)