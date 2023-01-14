import { Bytes32 } from "@lightclients/patronum/lib/types";
import { Slot } from "@lodestar/types";
import { FinalizedHeader } from "../clients/types";

type FinalityUpdate = {
  finalized_header: FinalizedHeader;
  signature_slot: Slot;
  signature: Bytes32;
}

export class LightClientFinalityUpdate {
  finalityUpdate: FinalityUpdate
  
    constructor(finalityUpdate: FinalityUpdate) {
      this.finalityUpdate = finalityUpdate;
    }
  
    static fromRPC(rpc: {finalized_header:FinalizedHeader, signature_slot: Slot, signature: Bytes32}) {
      return new LightClientFinalityUpdate(rpc);
    }
  
    toRPC() {
      return {
        finalized_header: this.finalityUpdate.finalized_header,
        signature_slot: this.finalityUpdate.signature_slot,
        signature: this.finalityUpdate.signature
      };
    }    
}

export class LightClientOptimisticUpdate {
  prev_block_root: string;
  block_root: string;
  block_slot: number;

  constructor(prev_block_root: string, block_root: string, block_slot: number) {
    this.prev_block_root = prev_block_root;
    this.block_root = block_root;
    this.block_slot = block_slot;
  }

  static fromRPC(rpc: any) {
    return new LightClientOptimisticUpdate(rpc.prev_block_root, rpc.block_root, rpc.block_slot);
  }

  toRPC() {
    return {
      prev_block_root: this.prev_block_root,
      block_root: this.block_root,
      block_slot: this.block_slot
    };
  }
}
