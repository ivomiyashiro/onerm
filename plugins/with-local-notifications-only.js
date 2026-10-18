// Plain CommonJS: Expo only transpiles app.config.ts itself, not the local files it imports.
const { withEntitlementsPlist } = require('expo/config-plugins');

// expo-notifications always adds the push entitlement, but a personal Apple team can't sign
// an app that has it (#217). The app only schedules local notifications, which don't need it.

const PUSH_ENTITLEMENT = 'aps-environment';

/**
 * @template {Record<string, unknown>} T
 * @param {T} entitlements
 */
function dropPushEntitlement(entitlements) {
  const { [PUSH_ENTITLEMENT]: _push, ...rest } = entitlements;
  return rest;
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withLocalNotificationsOnly = (config) =>
  withEntitlementsPlist(config, (mod) => {
    mod.modResults = dropPushEntitlement(mod.modResults);
    return mod;
  });

module.exports = withLocalNotificationsOnly;
module.exports.dropPushEntitlement = dropPushEntitlement;
