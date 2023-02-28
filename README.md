# OPLite -- A Fork of [Kevlar](https://github.com/lightclients/kevlar)

A light client for interacting with the [Beacon Chain](beaconcha.in)

---

## What is Kevlar?

Kevlar is a CLI tool to run a light client-based RPC Proxy for PoS Ethereum. Kevlar can be used to make your Metamask or any RPC-based wallet completely trustless! Kevlar first syncs to the latest header of the beacon chain and then starts an RPC server. This local RPC server can be added to MetaMask or any other RPC-based wallet. Every RPC call made by the wallet is now verified using Merkle Inclusion proofs to the latest block header. Currently Kevlar supports two kinds of sync methods: the **Light Sync** based on the light client sync protocol specified by the Ethereum Specification and the **Optimistic Sync** (which is 100x faster than Light Sync) based on construction from the research paper [Proofs of Proof of Stake in Sublinear Complexity](https://arxiv.org/abs/2209.08673).

### Notes

#### BeaconAPIProver vs. LightOptimisticProver

The main difference between the two is that the first code uses the BeaconAPIProver class, which is designed to work with a light client, while the second code uses the LightOptimisticProver class, which is designed to work with an optimistic client.

The BeaconAPIProver class connects to an HTTP server that implements an Ethereum 2.0 beacon node JSON-RPC API to fetch and return LightClientUpdates for a specific period. It also uses an in-memory cache to store the LightClientUpdates it has fetched so that it can quickly return the data without having to refetch it from the server.

The LightOptimisticProver class connects to an HTTP server that implements a similar JSON-RPC API to fetch and return information about validator committees and their hashes for a specific period, as well as LightClientUpdates for a specific period.

Both classes use similar techniques to fetch data from the server, cache it, and return it to the client. The main difference is the type of data they fetch, and the structure of that data.

#### Improvements

1. Modularization:

- Extracting the common functionality in the LightClient and OptimisticLightClient classes into a separate utility class. For example, the syncUpdateVerifyGetCommittee method could be extracted into a separate class that can be reused by both the LightClient and OptimisticLightClient classes.

- Extracting the functionality that interacts with the beacon chain API into a separate class that implements the IBeaconChainAPI interface.

- Extracting the functionality that interacts with the store into a separate class that implements the IStore interface.

1. Computational Efficiency:

- Caching: One way to improve computational efficiency is to cache the results of previous computations. For example, if the getCommittee method is called multiple times with the same period, the result can be cached and returned from the cache instead of making a new API call.

- Batching: Instead of making an API call for each period in the syncProver method, you could make a single API call that retrieves updates for multiple periods at once.

- Multithreading: Instead of sequentially calling the syncProver method for each prover, you could use multithreading to call the method in parallel for multiple provers. This could significantly reduce the time required to find an honest prover.

- Reducing unnecessary computation: You can review the code to see if there is any computation that is not necessary and remove it.

- Optimizing the algorithm: review the algorithm and see if there is a way to optimize it, for example, by using a more efficient data structure or a more efficient algorithm.

---
