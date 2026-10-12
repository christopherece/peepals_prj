import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// useSyncExternalStore uses the server snapshot during server rendering and hydration,
// then switches to the client snapshot, so we can tell whether we're on the server.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    subscribe,
    () => client,
    () => server
  );
}
