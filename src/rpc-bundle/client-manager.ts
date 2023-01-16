import { init } from '@chainsafe/bls/switchable';
import { Chain } from '@ethereumjs/common';
import { VerifyingProvider } from '@lightclients/patronum';
import { BaseClient } from '../clients/base-client.js';
import { LightOptimisticProver } from '../provers/light-optimistic/client.js';
import { OptimisticLightClient } from '../clients/optimistic/index.js';
import { getDefaultClientConfig } from './utils.js';
import { ExecutionInfo } from '../clients/types.js';

export class ClientManager {
  client: BaseClient;

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

  // returns a promise of a "VerifyingProvider" object. The function first attempts to initialize a library called "blst-native", and if that fails, it falls back to initializing "herumi" instead. Then it calls the "sync" method on a "client" object, and afterwards it retrieves blockhash and blockNumber information from the client, using the "getNextValidExecutionInfo" method. With this information, it creates a new "VerifyingProvider" object and assigns it to the "provider" variable. Finally, the function subscribes to the base client and logs a message when an execution info event is emitted.
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
      console.log(`
                                                          ░▓▓▓▓▓                                                                        
                                                          ▓▓▓▓▓▓░░                                                                      
                                                          ▓▓▓▓▓▓▓▓                                                                    
                                                          ▓▓▓▓▓▓▓▓                                                                    
                                                          ▓▓▓▓▓▓▓▓                                                                    
                                                        ░░▓▓▓▓▓▓▓▓▒▒                                                                  
                                                      ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░                                                              
                                                      ▓▓▓▓████▓▓████▓▓▓▓                                                              
                                                    ▒▒▓▓██▓▓████▓▓▒▒▓▓▓▓▒▒                                                            
                                                    ▓▓▓▓██  ████▒▒  ▓▓▓▓▓▓                                                            
                                                    ██▓▓▓▓          ▓▓▓▓▓▓                                                            
                                                    ▓▓▓▓▓▓          ▓▓▓▓▓▓                                                            
                                                    ▓▓▓▓▓▓          ▓▓▓▓▓▓                                                            
                                                    ▓▓▓▓▓▓          ▓▓▓▓▓▓                                                            
                                                    ▓▓▓▓▓▓          ▓▓▓▓▓▓    

                                                    ✨  LATEST EXECUTION
            Block Number ${ei.blockNumber} Block Hash ${ei.blockhash}
            
                                                    ⏰  Awaiting next OSSU...`,
      );
      provider.update(ei.blockhash, ei.blockNumber);
    });

    return provider;
  }
}
