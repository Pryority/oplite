// This is the entry point for the light client. 
//
// The ClientManager manages the synchronization of the light client with the Ethereum blockchain. 
// It uses the provided information (i.e. an Ethereum chain, a beacon chain API URL, a provider URL, an array of prover URLs, and an optional number)
// to initialize a light client object, which is an instance of the "OptimisticLightClient" class. 
// The "sync" method of this class is then called to synchronize the light client with the Ethereum blockchain. 

import { init } from '@chainsafe/bls/switchable';
import { Chain } from '@ethereumjs/common';
import { VerifyingProvider } from '@lightclients/patronum';
import { BaseClient } from '../clients/base-client.js';
import { LightOptimisticProver } from '../provers/light-optimistic/client.js';
import { OptimisticLightClient } from '../clients/optimistic/index.js';
import { getDefaultClientConfig } from './utils.js';
import { ExecutionInfo } from '../clients/types.js';

/**
* @class ClientManager
* @classdesc The ClientManager manages the synchronization of the light client with the Ethereum blockchain.
* It uses the provided information (i.e. an Ethereum chain, a beacon chain API URL, a provider URL, an array of prover URLs, and an optional number) to initialize a light client object, 
* which is an instance of * the "OptimisticLightClient" class.
* @param {Chain} chain - The Ethereum chain that the client should be syncing to.
* @param {string} beaconChainAPIURL - The URL of the beacon chain API.
* @param {string} providerURL - The URL of the JSON-RPC endpoint for the Ethereum node that the client should be connecting to.
* @param {string[]} proverURLS - The URLs of the provers that the client should be connecting to.
* @param {number} [n] - An optional parameter that can be used to configure the client.
* ----------------------------------------------------------------------------------------------------------------------
*/
export class ClientManager {
  client: BaseClient;



  /**
   * Initializes a new instance of the ClientManager class.
   * @param chain The Ethereum chain that the client will connect to.
   * @param beaconChainAPIURL The URL of the beacon chain API.
   * @param providerURL The URL of the Ethereum node that the client will connect to.
   * @param proverURLS An array of URLs of the provers that the client will use.
   * @param n Optional number.
   * --------------------------------------------------------------------
   */
  constructor(
    protected chain: Chain,
    beaconChainAPIURL: string,
    protected providerURL: string,
    proverURLS: string[],
    n?: number,
  ) {
    const config = getDefaultClientConfig(chain, n);
    const provers = proverURLS.map(pu => new LightOptimisticProver(pu));
    this.client = new OptimisticLightClient(
      config,
      beaconChainAPIURL,
      provers,
    );
  }




  /**
  * @function sync
  * @async
  * @memberof ClientManager
  * @instance
  * @desc Returns a promise of a "VerifyingProvider" object. The VerifyingProvider is a class that provides a set of methods to interact with an Ethereum node over JSON-RPC,
  * with the added feature of being able * to verify certain information.
  * It wraps an instance of the RPC class, which is responsible for making JSON-RPC calls to the Ethereum node, and provides methods to retrieve information such as the balance of an address, 
  * the code at an * address, the number of transactions sent from an address, and the receipt of a transaction.
  * Additionally, it also stores information about the latest block number and block hash, and has the ability to update this information. It also has a VM field that is optional, which is used 
  * to execute smart * contract on the client side.
  * The function first attempts to initialize a library called "blst-native", and if that fails, it falls back to initializing "herumi" instead.
  * Then it calls the "sync" method on a "client" object, and afterwards it retrieves blockhash and blockNumber information from the client, using the "getNextValidExecutionInfo" method.
  * With this information, it creates a new "VerifyingProvider" object and assigns it to the "provider" variable. Finally, the function subscribes to the base client and logs a message when an 
  * execution info * event is emitted.
  @returns {Promise<VerifyingProvider>} - A promise that resolves to an instance of the VerifyingProvider class.
  * -------------------------------------------------------------------------------------------------------------------------------------
  */
  async sync(): Promise<VerifyingProvider> {
    try {
      await init('blst-native');
    } catch {
      await init('herumi');
    }

    await this.client.sync();
    const { blockhash, blockNumber } =
      await this.client.getNextValidExecutionInfo();
    const provider = new VerifyingProvider(
      this.providerURL,
      blockNumber,
      blockhash,
      this.chain,
    );
    // 2. HAPPENS IMMEDIATELY AFTER SUBSCRIBING TO THE BASE CLIENT
    this.client.subscribe(ei => {
      let prevEI: ExecutionInfo;
      console.log(`✨  OSSU - GOT PAYLOAD - Block Number ${ei.blockNumber} | Block Hash ${ei.blockhash}
      
⏰  AWAITING - Latest Slot\n`,
      );
      provider.update(ei.blockhash, ei.blockNumber);
    });

    return provider;
  }



}
