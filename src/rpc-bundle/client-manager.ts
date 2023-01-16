import { init } from '@chainsafe/bls/switchable';
import { Chain } from '@ethereumjs/common';
import { VerifyingProvider } from '@lightclients/patronum';
import { BaseClient } from '../clients/base-client.js';
import { LightOptimisticProver } from '../provers/light-optimistic/client.js';
import { OptimisticLightClient } from '../clients/optimistic/index.js';
import { getDefaultClientConfig } from './utils.js';

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
      console.log(
        `✨ Client Manager got blockheader from latest execution: ${ei.blockNumber} ${ei.blockhash}\n`,
      );
      provider.update(ei.blockhash, ei.blockNumber);
    });

    return provider;
  }
}
