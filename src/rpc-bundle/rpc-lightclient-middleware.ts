import { createAsyncMiddleware } from 'json-rpc-engine';
import { getJSONRPCServer } from '@lightclients/patronum';
import { ClientManager } from './client-manager.js';
import { ClientType } from '../constants.js';
import {
  defaultBeaconAPIURL,
  defaultProvers,
  defaultPublicRPC,
} from './constants.js';
import { EthereumRpcError, ethErrors } from 'eth-rpc-errors';

// A middleware function for the JSON-RPC proxy server. 
// It creates a new instance of the ClientManager class, 
// synchronizes it with the network, and then creates a 
// JSON-RPC server using the provider returned by the sync function.

export function getRPCLightClientMiddleware(network: number) {
  const beaconAPIURL = defaultBeaconAPIURL[network];
  const proverURLs = defaultProvers[network];
  const [providerURL] = defaultPublicRPC[network];
  if (!defaultBeaconAPIURL[network] || !defaultProvers[network] || !defaultPublicRPC[network]) {
    throw new Error(`Invalid network value: ${network}`);
  }
  const cm = new ClientManager(
  network,
  beaconAPIURL,
  providerURL,
  proverURLs,
  );
  const syncPromise = cm.sync();
  let server: any = null;
  
  return createAsyncMiddleware(async (req: any, res: any, next: any) => {
  if (server === null) {
  const provider = await syncPromise;
  server = getJSONRPCServer(provider);
  }

  const _res = await server.receive(req);
  // TODO: fix error
  if (!_res)
    throw ethErrors.rpc.internal({
      message: `something went wrong`,
    });
  else if (_res.error)
    throw ethErrors.rpc.internal({
      data: _res.error,
    });
  res.result = _res.result;
  });
}
