import { ContainerType } from '@chainsafe/ssz';
import { IBeaconConfig } from '@lodestar/config';
import { PubKeyString, Slot } from '../types.js';

export type GenesisData = {
  committee: PubKeyString[];
  slot: Slot;
  time: number;
};

export type ClientConfig = {
  genesis: GenesisData;
  chainConfig: IBeaconConfig;
  // treeDegree in case of Superlight and batchSize in case of Light and Optimistic
  n?: number;
};

export type ProverInfo = {
  index: number;
  syncCommittee: Uint8Array[];
};

export type ExecutionInfo = {
  blockhash: string;
  blockNumber: bigint;
};

export type VerifyWithReason =
  | { correct: true }
  | { correct: false; reason: string };


export type FinalizedHeader = {
  attestedHeader: ContainerType<{
    slot: import("@chainsafe/ssz").UintNumberType;
    proposerIndex: import("@chainsafe/ssz").UintNumberType;
    parentRoot: import("@chainsafe/ssz").ByteVectorType;
    stateRoot: import("@chainsafe/ssz").ByteVectorType;
    bodyRoot: import("@chainsafe/ssz").ByteVectorType;
  }>;
}