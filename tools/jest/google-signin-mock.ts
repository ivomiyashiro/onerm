// The native Google sign-in module doesn't exist in plain Node (the integration tests that build the
// composition root). The gateway is tested with a fake picker; this only lets the import load.
export const GoogleSignin = { configure: () => {} };
export const isCancelledResponse = () => false;
export const isErrorWithCode = () => false;
export const statusCodes = {};
