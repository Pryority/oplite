import { IProver } from '../../clients/optimistic/iprover';
import { CommitteeSSZ, HashesSSZ, LightClientUpdateSSZ } from '../../ssz.js';
import { LightClientUpdate, Bytes32 } from '../../types';
import { handleGETRequest } from '../../utils.js';

// This prover can only be used by an optimistic client
export class LightOptimisticProver implements IProver {
  cachedHashes = new Map<number, Uint8Array>();
  cache = new Map<string, any>();

  constructor(protected serverURL: string) {}

  async getCommittee(period: number | 'latest'): Promise<Uint8Array[]> {
    let res: Uint8Array | undefined = await this.cache.get(`/sync-committee/${period}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/${period}`);
    res = await this.cache.get(`/sync-committee/${period}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/${period}`);
    await this.cache.set(`/sync-committee/${period}`, res);
    console.log('CommitteeSSZ.deserialize(res)', CommitteeSSZ.deserialize(res))
    return CommitteeSSZ.deserialize(res);
  }

  async getSyncUpdate(period: number): Promise<LightClientUpdate> {
    let res: Uint8Array | undefined = await this.cache.get(`/sync-committee/${period}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/${period}`);
    try {
      res = await this.cache.get(`/sync-committee/${period}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/${period}`);
      await this.cache.set(`/sync-committee/${period}`, res);
    } catch (error) {
      console.error(error);
    }
    console.log('LightClientUpdateSSZ.deserialize(new Uint8Array(res))',LightClientUpdateSSZ.deserialize(new Uint8Array(res)))
    return LightClientUpdateSSZ.deserialize(new Uint8Array(res));
  }

  async _getHashes(startPeriod: number, count: number): Promise<Uint8Array[]> {
    let res: Uint8Array | undefined = await this.cache.get(`/sync-committee/hashes?startPeriod=${startPeriod}&maxCount=${count}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/hashes?startPeriod=${startPeriod}&maxCount=${count}`);
    res = await this.cache.get(`/sync-committee/hashes?startPeriod=${startPeriod}&maxCount=${count}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/hashes?startPeriod=${startPeriod}&maxCount=${count}`);
    await this.cache.set(`/sync-committee/hashes?startPeriod=${startPeriod}&maxCount=${count}`, res);
    console.log('HashesSSZ.deserialize(res)',HashesSSZ.deserialize(res))
    return HashesSSZ.deserialize(res);
  }
        
  async getBlockRoot(blockRoot: Bytes32): Promise<Uint8Array> {
  let res: Uint8Array | undefined = await this.cache.get(`/sync-committee/block-root/${blockRoot}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/block-root/${blockRoot}`);
  try {
  res = await this.cache.get(`/sync-committee/block-root/${blockRoot}`) as Uint8Array || await handleGETRequest(`${this.serverURL}/sync-committee/block-root/${blockRoot}`);
  await this.cache.set(`/sync-committee/block-root/${blockRoot}`, res);
  } catch (error) {
  console.error(error);
  }
  return res;
  }

  async getCommitteeHash(period: number, currentPeriod: number, cacheCount: number): Promise<Uint8Array | undefined> {
    const _count = Math.min(currentPeriod - period + 1, cacheCount);
    if (!this.cachedHashes.has(period)) {
    const vals = await this._getHashes(period, _count);
    for (let i = 0; i < _count; i++) {
    this.cachedHashes.set(period + i, vals[i]);
    }
    }
    return this.cachedHashes.get(period);
  }
}
