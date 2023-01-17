// A light client implementation that uses "provers" (implementations of the IProver interface) 
// to verify information from the Ethereum network and maintain its own copy of the Ethereum state.

import { BaseClient } from '../base-client.js';
import { ClientConfig, ProverInfo } from '../types.js';
import { IProver } from './iprover.js';
import { DEFAULT_BATCH_SIZE } from '../constants.js';
import { isUint8ArrayEq } from '../../utils.js';

export type ProverInfoL = {
  syncCommitteeHash: Uint8Array;
  index: number;
};

/** ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
* Creates an instance of OptimisticLightClient.
* @param {ClientConfig} config - Client configuration
* @param {string} beaconChainAPIURL - URL of the beacon chain API
* @param {IProver[]} provers - Array of provers
* @memberof OptimisticLightClient
*/
export class OptimisticLightClient extends BaseClient {
  batchSize: number;
  //
  constructor(
    config: ClientConfig,
    beaconChainAPIURL: string,
    protected provers: IProver[],
  ) {
    super(config, beaconChainAPIURL);
    this.batchSize = config.n || DEFAULT_BATCH_SIZE;
  }
  // ------------------------------------------------

  /** ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
  * Get the committee for a specific period
  * @param {number} period - The period to get the committee for
  * @param {number} proverIndex - The index of the prover to use
  * @param {Uint8Array} expectedCommitteeHash - The expected committee hash
  * @returns {Promise<Uint8Array[]>} - An array of committee members
  */
  async getCommittee(
    period: number,
    proverIndex: number,
    expectedCommitteeHash: Uint8Array | undefined,
  ): Promise<Uint8Array[]> {
    if (period === this.genesisPeriod) return this.genesisCommittee;
    if (!expectedCommitteeHash) throw new Error('expectedCommitteeHash required');
    // console.log('this.provers[proverIndex].getCommittee(period)',this.provers[proverIndex].getCommittee(period))
    return await this.provers[proverIndex].getCommittee(period);
  // * -----------------------------------------------------------------------------------------------------------------------------------------------------------
  } 


  /** ▬▬  C H E C K  C O M M I T T E E  H A S H  A T  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
  * Check whether the committee hash of a given prover matches the expected committee hash.
  * @param proverIndex The index of the prover in the list of provers.
  * @param expectedCommitteeHash The expected committee hash.
  * @param period The period of the committee.
  * @param prevCommittee The previous committee.
  * @returns A promise that resolves to a boolean indicating whether the expected committee hash matches the actual committee hash.
  */
  async checkCommitteeHashAt(proverIndex: number, expectedCommitteeHash: Uint8Array, period: number, prevCommittee: Uint8Array[]): Promise<boolean> {
    const update = await this.provers[proverIndex].getSyncUpdate(period - 1);
    const validOrCommittee = await this.syncUpdateVerifyGetCommittee(prevCommittee, period, update);
    return validOrCommittee && isUint8ArrayEq(this.getCommitteeHash(validOrCommittee), expectedCommitteeHash);
  // * -----------------------------------------------------------------------------------------------------------------------------------------------------------
  } 


  /** ▬▬  F I G H T  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
  * Compare the committee hashes of two provers.
  * @param prover1 The first prover to compare.
  * @param prover2 The second prover to compare.
  * @param period The period of the committee.
  * @param prevCommitteeHash The previous committee hash.
  * @returns A promise that resolves to an array of two booleans indicating whether each prover's committee hash matches the expected committee hash.
  */
  async fight(prover1: ProverInfoL, prover2: ProverInfoL, period: number, prevCommitteeHash: Uint8Array): Promise<[boolean, boolean]> {
    let prevCommittee = period === this.genesisPeriod ? this.genesisCommittee : await this.getCommittee(period - 1, prover1.index, prevCommitteeHash)
    prevCommittee = prevCommittee || await this.getCommittee(period - 1, prover2.index, prevCommitteeHash)
    return [await this.checkCommitteeHashAt(prover1.index, prover1.syncCommitteeHash, period, prevCommittee),
    await this.checkCommitteeHashAt(prover2.index, prover2.syncCommitteeHash, period, prevCommittee)];
  // * -----------------------------------------------------------------------------------------------------------------------------------------------------------
  } 


  /** ▬▬  T O U R N A M E N T  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
  * Determine the winner of a tournament between a list of provers.
  * @param proverInfos A list of provers participating in the tournament.
  * @param period The period of the committee.
  * @param lastCommitteeHash The previous committee hash.
  * @returns A promise that resolves to the winner of the tournament.
  */
  async tournament(proverInfos: ProverInfoL[], period: number, lastCommitteeHash: Uint8Array) {
    let winners = [proverInfos[0]];
    for (let i = 1; i < proverInfos.length; i++) {
      const currProver = proverInfos[i];
      if (isUint8ArrayEq(winners[0].syncCommitteeHash, currProver.syncCommitteeHash)) {
        winners.push(currProver);
      } else {
        const areCurrentWinnersHonest = await this.fight(winners[0], currProver, period, lastCommitteeHash);
        if (!areCurrentWinnersHonest) winners = [currProver];
      }
    }
    return winners;
  // * -----------------------------------------------------------------------------------------------------------------------------------------------------------
  } 


  /** ▬▬  S Y N C  F R O M  G E N E S I S  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬●
 * Synchronize the local state with the state of the provers from the genesis period to the current period.
 * @async
 * @returns {Promise<ProverInfo[]>} A promise that resolves to an array of ProverInfo objects.
 * @throws {Error} If none of the provers respond honestly.
 */
  async syncFromGenesis(): Promise<ProverInfo[]> {
    const currentPeriod = this.getCurrentPeriod();
    let lastCommitteeHash: Uint8Array | null | undefined = this.getCommitteeHash(this.genesisCommittee);
    let proverInfos: ProverInfoL[] = this.provers.map((_, i) => ({index: i, syncCommitteeHash: new Uint8Array()}));
    let foundConflict = false;
    for (let period = this.genesisPeriod + 1; period <= currentPeriod; period++) {
      const committeeHashes: (Uint8Array | null | undefined)[] = await Promise.all(proverInfos.map(async pi => {
      try {
        return await this.provers[pi.index].getCommitteeHash(period, currentPeriod, this.batchSize);
      } catch (e) {
        return null;
      }
      }));
      const nonNullIndex = committeeHashes.findIndex(v => v !== null);
      if (nonNullIndex === -1) {
        proverInfos = [];
        break;
      }
    
      for (let j = nonNullIndex + 1; j < committeeHashes.length; j++) {
        if (committeeHashes[j] !== null && !isUint8ArrayEq(committeeHashes[j]!, committeeHashes[nonNullIndex]!)) {
          foundConflict = true;
          break;
        }
      }
      if (!foundConflict) {
        const index = proverInfos[nonNullIndex].index;
        const committee = await this.getCommittee(currentPeriod, index, committeeHashes[nonNullIndex]!);
        return [{index: index, syncCommittee: committee}];
      }
      proverInfos = proverInfos.filter((pi: ProverInfoL, i: number) => (committeeHashes[i] !== null));
      proverInfos = await this.tournament(proverInfos, period, lastCommitteeHash);
      if (proverInfos.length === 0) throw new Error('none of the provers responded honestly :(');
      else if (proverInfos.length === 1) {
        try {
          lastCommitteeHash = await this.provers[proverInfos[0].index].getCommitteeHash(currentPeriod, currentPeriod, this.batchSize);
          break;
        } catch (e) {
          throw new Error(`none of the provers responded honestly :( : ${e.message}`);
        }
      } else lastCommitteeHash = proverInfos[0].syncCommitteeHash;
    
      foundConflict = false;
    }
    for (const p of proverInfos) {
      try {
      const committee = await this.getCommittee(currentPeriod, p.index, lastCommitteeHash);
      return [{index: p.index, syncCommittee: committee}
      ];
      } catch (e) {}
    }
    throw new Error('none of the provers responded honestly :(');
  }
}
