// LightClient - A child class of the BaseClient class, and has a few additional properties and methods.
// ----------------------------------------------------------------------------------------------------
// Purpose: used to retrieve and verify data from a beacon chain. This is achieved by using
// the syncProver method, which retrieves and verifies updates from the beacon chain for a 
// given period of time. It takes in an IProver object, a startPeriod, a currentPeriod, and 
// a startCommittee. It will iterate from the startPeriod to the currentPeriod and for each 
// period, it will call the getSyncUpdate method on the passed IProver object and will call syncUpdateVerifyGetCommittee method to verify the update. If the update is valid, it will call the addUpdate method on the store object and set the startCommittee to the validOrCommittee.
// The syncFromGenesis method is used to retrieve the current sync committee and prover index of the first honest prover. It uses the syncProver method and will iterate through the array of provers and call the syncProver method on each one. If the period returned is equal to the currentPeriod it will return the prover info.

import { BaseClient } from '../base-client.js';
import { ClientConfig, ProverInfo } from '../types.js';
import { IProver } from './iprover.js';
import { IStore } from './istore';
import { DEFAULT_BATCH_SIZE } from '../constants.js';

export class LightClient extends BaseClient {
  batchSize: number;

  constructor(config: ClientConfig, beaconChainAPIURL: string, protected provers: IProver[], protected store?: IStore) {
    super(config, beaconChainAPIURL);
    this.batchSize = config.n || DEFAULT_BATCH_SIZE;
  }

  // Returns the last valid sync committee
  async syncProver(prover: IProver, startPeriod: number, currentPeriod: number, startCommittee: Uint8Array[]): Promise<{ syncCommittee: Uint8Array[]; period: number }> {
    for (let period = startPeriod; period < currentPeriod; period++) {
    try {
    const update = await prover.getSyncUpdate(period, currentPeriod, this.batchSize);
    const validOrCommittee = await this.syncUpdateVerifyGetCommittee(startCommittee, period, update);
    if (!validOrCommittee) return { syncCommittee: startCommittee, period };
    if (this.store) await this.store.addUpdate(period, update);
    startCommittee = validOrCommittee;
    } catch (e) {
    return { syncCommittee: startCommittee, period };
    }
    }
    return { syncCommittee: startCommittee, period: currentPeriod };
  }

  // returns the prover info containing the current sync
  // committee and prover index of the first honest prover
  protected async syncFromGenesis(): Promise<ProverInfo[]> {
    const currentPeriod = this.getCurrentPeriod();
    let startPeriod = this.genesisPeriod;
    let startCommittee = this.genesisCommittee;
    console.log(`Sync started from period ${startPeriod} to ${currentPeriod} using ${this.provers.length} Provers`);

    for (let i = 0; i < this.provers.length; i++) {
      const { syncCommittee, period } = await this.syncProver(this.provers[i], startPeriod, currentPeriod, startCommittee);
      if (period === currentPeriod) return [{ index: i, syncCommittee }];
      startPeriod = period;
      startCommittee = syncCommittee;
    }
    throw new Error('no honest prover found');
  }
}
