import { AsyncOrSync } from 'ts-essentials';
import AsyncRetry from 'async-retry';
import axios from 'axios';
import * as altair from '@lodestar/types/altair';
import * as phase0 from '@lodestar/types/phase0';
import * as bellatrix from '@lodestar/types/bellatrix';
import { digest } from '@chainsafe/as-sha256';
import { IBeaconConfig } from '@lodestar/config';
import type { PublicKey } from '@chainsafe/bls/types';
import bls from '@chainsafe/bls/switchable';
import { ListCompositeType, fromHexString, toHexString } from '@chainsafe/ssz';
import {
  computeSyncPeriodAtSlot,
  getCurrentSlot,
} from '@lodestar/light-client/utils';
import {
  assertValidLightClientUpdate,
  assertValidSignedHeader,
} from '@lodestar/light-client/validation';
import { BEACON_SYNC_SUPER_MAJORITY, POLLING_DELAY } from './constants.js';
import { isCommitteeSame, concatUint8Array } from '../utils.js';
import {
  ClientConfig,
  ProverInfo,
  ExecutionInfo,
  VerifyWithReason,
} from './types.js';
import { Bytes32, OptimisticUpdate, LightClientUpdate } from '../types.js';

export abstract class BaseClient {
  genesisCommittee: Uint8Array[];
  genesisPeriod: number;
  genesisTime: number;
  chainConfig: IBeaconConfig;

  latestCommittee: Uint8Array[];
  latestPeriod: number = -1;
  latestBlockHash: string;

  constructor(config: ClientConfig, protected beaconChainAPIURL: string) {
    this.genesisCommittee = config.genesis.committee.map(pk =>
      fromHexString(pk),
    );
    this.genesisPeriod = computeSyncPeriodAtSlot(config.genesis.slot);
    this.genesisTime = config.genesis.time;
    this.chainConfig = config.chainConfig;
  }

  protected abstract syncFromGenesis(): Promise<ProverInfo[]>;

  public async sync(): Promise<void> {
    const currentPeriod = this.getCurrentPeriod();
    if (currentPeriod <= this.latestPeriod) {return }
    const proverInfos = await this.syncFromGenesis();
    // const proverInfosAsHex = proverInfos[0].syncCommittee.map(pk => smallHexStr(pk))
    // console.log('PROVERS:', proverInfosAsHex)

    if (proverInfos.length === 0) throw new Error("Failed to retrieve proverInfos");
    this.latestCommittee = proverInfos[0].syncCommittee;
    this.latestPeriod = currentPeriod;
    // console.log('proverInfos[0].syncCommittee',proverInfos[0].syncCommittee)
  }

  public get isSynced() {
    return this.latestPeriod === this.getCurrentPeriod();
  }

  // Checks if there are any new updates and if so, it retrieves the latest execution. It uses the async-retry library to retry up to 3 times if there is an error. If there is still no execution after 3 retries, it throws an error.
  async checkUpdates() {
    try {
        await AsyncRetry(async (bail: unknown) => {
            const execution = await this.getLatestExecution();
            // if execution is not null, return
            if (execution) {
                return execution;
            }
            // else, throw an error
            throw new Error('🚫 Invalid Optimistic Update: insufficient signatures');
        }, {
            retries: 3,  // number of retries
            onRetry: (e: Error) => console.log(e.message) // log the error message
        });
    } catch (err) {
        console.error(err);
    }
  }

  // FIRST THE ENGINE SUBSCRIBES TO THE EXECUTION
  // This function subscribes to the execution and calls the provided callback function with the execution info as the argument. It uses setTimeout to periodically check for new updates and call the callback function.
  public async subscribe(callback: (ei: ExecutionInfo) => AsyncOrSync<void>) {
    let timeoutId: any;
    const checkUpdates = async () => {
        try {
            await this.sync();
            console.log('⏳ Optimistic Update - Verifying execution...')
            const ei = await this.getLatestExecution();
            if (ei && ei.blockhash !== this.latestBlockHash) {
                this.latestBlockHash = ei.blockhash;
                await callback(ei);
            }
            timeoutId = setTimeout(checkUpdates, POLLING_DELAY);
        } catch (e) {
            console.error(e);
        }
    }
    timeoutId = setTimeout(checkUpdates, POLLING_DELAY);
  }

  // This function retrieves the latest execution from the server and returns it as an OptimisticUpdate object.
  protected async getLatestExecution(): Promise<ExecutionInfo | null> {
    const { data } = await axios.get(`${this.beaconChainAPIURL}/eth/v1/beacon/light_client/optimistic_update`);
    const opUp = this.optimisticUpdateFromJSON(data.data);
    const verify = await this.optimisticUpdateVerify(this.latestCommittee, opUp);
    if (!verify.correct) throw new Error(`🚫 Invalid Optimistic Update: ${verify.reason}`);
    console.log(`✅ Optimistic Update - VERIFIED - Slot ${data.data.attested_header.slot}, Header ${data.data.attested_header.body_root}`);
    return this.getExecutionFromBlockRoot(data.data.attested_header.slot, data.data.attested_header.body_root);
  }

  // LOTS OF LOGGING HERE
  protected async getExecutionFromBlockRoot(
    slot: bigint,
    expectedBlockRoot: Bytes32,
  ): Promise<ExecutionInfo> {
    const { data: { data: { message: { body: blockJSON } } } } = await axios.get(`${this.beaconChainAPIURL}/eth/v2/beacon/blocks/${slot}`);
    // console.log(blockJSON)
    const x = blockJSON.execution_payload;
    // console.log(x)
    const block = bellatrix.ssz.BeaconBlockBody.fromJson(blockJSON);
    // const types = guessAbiEncodedData(blockJSON);
    // console.log(block)
    const blockRoot = toHexString(bellatrix.ssz.BeaconBlockBody.hashTreeRoot(block));
    if (blockRoot !== expectedBlockRoot) throw Error(`block provided by the beacon chain api doesn't match the expected block root`);

    return {
      blockhash: blockJSON.execution_payload.block_hash,
      blockNumber: blockJSON.execution_payload.block_number,
    };
  }
  
  public async getNextValidExecutionInfo(): Promise<ExecutionInfo> {
    let delay = POLLING_DELAY;
    const MAX_DELAY = 15;
    while (true) {
    const ei = await this.getLatestExecution();
    if (ei) return ei;
    console.log('EXECUTION INFO',ei);

    if (delay > MAX_DELAY) throw new Error('no valid execution payload found');
    // delay for the next slot
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = delay * 2;
    }
  }

  protected getCommitteeHash(committee: Uint8Array[]): Uint8Array {
    return digest(concatUint8Array(committee));
  }

  private deserializePubkeys(pubkeys: Uint8Array[]): PublicKey[] {
    return pubkeys.map(pk => bls.PublicKey.fromBytes(pk));
  }

  // This function is ovveride of the original function in
  // @chainsafe/lodestar-light-client/lib/utils/utils
  // this was required as the light client doesn't have access
  // to aggregated signatures
  protected async syncUpdateVerifyGetCommittee(prevCommittee: Uint8Array[], period: number, update: LightClientUpdate): Promise<false | Uint8Array[]> {
    try {
      // check if the update has valid signatures
      const prevCommitteeFast = {
        pubkeys: this.deserializePubkeys(prevCommittee),
        aggregatePubkey: bls.PublicKey.aggregate(this.deserializePubkeys(prevCommittee))
      };
      await assertValidLightClientUpdate(this.chainConfig, prevCommitteeFast, update);
      const updatePeriod = computeSyncPeriodAtSlot(update.attestedHeader.slot);
      if (period !== updatePeriod) {
        throw new Error(`Expected update with period ${period}, but received ${updatePeriod}`);
      }
      return update.nextSyncCommittee.pubkeys;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  protected async syncUpdateVerify(prevCommittee: Uint8Array[], currentCommittee: Uint8Array[], period: number, update: LightClientUpdate): Promise<boolean> {
    const nextCommittee = await this.syncUpdateVerifyGetCommittee(prevCommittee, period, update);
    if (nextCommittee) {
        return isCommitteeSame(nextCommittee, currentCommittee);
    }
    return false;
  }

  optimisticUpdateFromJSON(update: any): OptimisticUpdate {
    return altair.ssz.LightClientOptimisticUpdate.fromJson(update);
  }

  // Verifies the provided OptimisticUpdate. It returns an object containing the result of the verification and the reason for the result.
  async optimisticUpdateVerify(
    committee: Uint8Array[],
    update: OptimisticUpdate,
  ): Promise<VerifyWithReason> {
    const { attestedHeader: header, syncAggregate } = update;
    const headerBlockRoot = phase0.ssz.BeaconBlockHeader.hashTreeRoot(header);
    try {
      const pubkeys = this.deserializePubkeys(committee);
      const aggregatePubkey = bls.PublicKey.aggregate(pubkeys);
      const committeeFast = { pubkeys, aggregatePubkey };
      await assertValidSignedHeader(
        this.chainConfig,
        committeeFast,
        syncAggregate,
        headerBlockRoot,
        header.slot,
      );
    } catch (e) {
      return { correct: false, reason: 'invalid signatures' };
    }

    const participation = syncAggregate.syncCommitteeBits.getTrueBitIndexes().length;
    if (participation < BEACON_SYNC_SUPER_MAJORITY) {
      return { correct: false, reason: 'insufficient signatures' };
    }
      return { correct: true };
  }
  
  // This function calculates and returns the current period based on the current slot and the genesis time from the chain configuration.
  getCurrentPeriod(): number {
    return computeSyncPeriodAtSlot(
      getCurrentSlot(this.chainConfig, this.genesisTime),
    );
  }
}
