// The native module of expo-widgets doesn't exist in plain Node (the integration tests that build
// the composition root). The Live Activity adapter is tested with a fake; this only lets the
// import load.
export const createLiveActivity = () => ({
  start: () => ({ end: async () => {} }),
  getInstances: () => [],
});
