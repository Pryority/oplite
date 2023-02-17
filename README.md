# OPLite -- A Fork of Kevlar


A light client for interacting with a beacon chain (a type of blockchain) in the context of a proof-of-stake network. The LightClient class extends the BaseClient class and has a syncProver method that takes in a prover (an object that implements the IProver interface), a starting period, a current period, and a starting committee. It then iterates through the periods between the starting and current period and calls the prover's getSyncUpdate method to get an update for the current period. It then calls the syncUpdateVerifyGetCommittee method to verify the update and get the updated committee. If the update is valid, it adds it to the store (if provided) and updates the startCommittee. If no honest prover is found, the method throws an error. The OptimisticLightClient class is similar but it doesn't use a store and has a getCommittee method that takes in a period, prover index, and expected committee hash, and returns the committee for that period. It has a checkCommitteeHashAt method which compares the committee hash returned by the prover to the expected committee hash.

---

### Adding Gossip

To implement the Altair Light Client Networking functionality, you will need to update your existing code to include the necessary components and functions defined in the specification. Here are some steps you may take to implement this functionality:

Add support for the gossipsub domain: This will involve updating your code to subscribe to the light_client_finality_update and light_client_optimistic_update topics, as well as sending and receiving messages of the corresponding message types LightClientFinalityUpdate and LightClientOptimisticUpdate.
Add support for the Req/Resp domain: This will involve updating your code to handle new request types such as GetLightClientBootstrap, LightClientUpdatesByRange, GetLightClientFinalityUpdate, and GetLightClientOptimisticUpdate, as well as sending and receiving corresponding response messages.
Update the OptimisticLightClient class to include new methods and properties defined in the specification such as getCommittee, checkCommitteeHashAt, fight, syncUpdateVerifyGetCommittee, and getCommitteeHash
Update the ClientManager class to include new methods and properties defined in the specification such as sync
Update the IProver interface to include new methods and properties defined in the specification such as getCommittee, getSyncUpdate, and getCommitteeHash
Perform extensive testing to ensure that the implementation is fully compliant with the specification and that it functions correctly in different scenarios.
It's important to note that this is a high-level overview and there might be more details to consider when implementing this specification. It's recommended to carefully read and understand the specification before making any changes to your code.

Keep in mind that adding support for a new feature to a project can be a complex task, and it is important to have a good understanding of the existing codebase and architecture, as well as the new feature you are trying to implement.

### BeaconAPIProver vs. LightOptimisticProver

The main difference between the two is that the first code uses the BeaconAPIProver class, which is designed to work with a light client, while the second code uses the LightOptimisticProver class, which is designed to work with an optimistic client.

The BeaconAPIProver class connects to an HTTP server that implements an Ethereum 2.0 beacon node JSON-RPC API to fetch and return LightClientUpdates for a specific period. It also uses an in-memory cache to store the LightClientUpdates it has fetched so that it can quickly return the data without having to refetch it from the server.

The LightOptimisticProver class connects to an HTTP server that implements a similar JSON-RPC API to fetch and return information about validator committees and their hashes for a specific period, as well as LightClientUpdates for a specific period.

Both classes use similar techniques to fetch data from the server, cache it, and return it to the client. The main difference is the type of data they fetch, and the structure of that data.

### Improvements

Modularization:
Extracting the common functionality in the LightClient and OptimisticLightClient classes into a separate utility class. For example, the syncUpdateVerifyGetCommittee method could be extracted into a separate class that can be reused by both the LightClient and OptimisticLightClient classes.
Extracting the functionality that interacts with the beacon chain API into a separate class that implements the IBeaconChainAPI interface.
Extracting the functionality that interacts with the store into a separate class that implements the IStore interface.
Computational Efficiency:
Caching: One way to improve computational efficiency is to cache the results of previous computations. For example, if the getCommittee method is called multiple times with the same period, the result can be cached and returned from the cache instead of making a new API call.
Batching: Instead of making an API call for each period in the syncProver method, you could make a single API call that retrieves updates for multiple periods at once.
Multithreading: Instead of sequentially calling the syncProver method for each prover, you could use multithreading to call the method in parallel for multiple provers. This could significantly reduce the time required to find an honest prover.
Reducing unnecessary computation: You can review the code to see if there is any computation that is not necessary and remove it.
Optimizing the algorithm: review the algorithm and see if there is a way to optimize it, for example, by using a more efficient data structure or a more efficient algorithm.

---

Kevlar is a CLI tool to run a light client-based RPC Proxy for PoS Ethereum. Kevlar can be used to make your Metamask or any RPC-based wallet completely trustless! Kevlar first syncs to the latest header of the beacon chain and then starts an RPC server. This local RPC server can be added to MetaMask or any other RPC-based wallet. Every RPC call made by the wallet is now verified using Merkle Inclusion proofs to the latest block header. Currently Kevlar supports two kinds of sync methods: the **Light Sync** based on the light client sync protocol specified by the Ethereum Specification and the **Optimistic Sync** (which is 100x faster than Light Sync) based on construction from the research paper [Proofs of Proof of Stake in Sublinear Complexity](https://arxiv.org/abs/2209.08673).

### Start the RPC Proxy

```bash
npm i -g @lightclients/kevlar
kevlar
```

The PRC is now available at `http://localhost:8546`. Add this local network to metamask.

```bash
kevlar --help
Options:
      --help        Show help                                          [boolean]
      --version     Show version number                                [boolean]
  -n, --network     chain id to start the proxy on (1, 5)        [choices: 1, 5]
  -c, --client      type of the client          [choices: "light", "optimistic"]
  -o, --provers     comma separated prover urls
  -u, --rpc         rpc url to proxy
  -p, --port        port to start the proxy                             [number]
  -a, --beacon-api  beacon chain api URL
```

### Build Locally

Clone the repo and perform the following commands

```bash
yarn install
yarn build
```

### Run Server

```bash
cp .env.example .env
yarn start
```

### Deploy Server to heroku

```bash
bash src/provers/light-optimistic/deploy-heroku.sh <heroku-app-name>
```

### Deploy to Docker

```bash
docker run -p 8546:8546 --name kevlar shresthagrawal/kevlar
curl -X POST --header "Content-type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8546/
```
