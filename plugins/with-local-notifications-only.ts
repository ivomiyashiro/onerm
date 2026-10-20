import { type ConfigPlugin, withEntitlementsPlist } from 'expo/config-plugins';

// expo-notifications always adds the push entitlement, but a personal Apple team can't sign
// an app that has it (#217). The app only schedules local notifications, which don't need it.

const PUSH_ENTITLEMENT = 'aps-environment';

export function dropPushEntitlement<T extends Record<string, unknown>>(entitlements: T) {
  const { [PUSH_ENTITLEMENT]: _push, ...rest } = entitlements;
  return rest;
}

const withLocalNotificationsOnly: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    mod.modResults = dropPushEntitlement(mod.modResults);
    return mod;
  });

export default withLocalNotificationsOnly;
