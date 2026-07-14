/** @type {import('expo/config').ExpoConfig} */
const base = require('./app.json');

/** Same host as learn_thrillion_ui staging API */
const STAGING_API_ORIGIN = 'https://staging.learnthrillion.com';

/**
 * Only bake an API origin when building (EAS) or when explicitly set.
 * Local `expo start` leaves this empty so config/api.js uses the Metro LAN host.
 */
const fromEnv = (process.env.EXPO_PUBLIC_API_ORIGIN || '').trim();
const isEasBuild = process.env.EAS_BUILD === 'true';
const apiOrigin = fromEnv || (isEasBuild ? STAGING_API_ORIGIN : '');

module.exports = {
  expo: {
    ...base.expo,
    ios: {
      ...base.expo.ios,
      infoPlist: {
        ...(base.expo.ios?.infoPlist || {}),
        // Allow http://LAN:8000 during local device testing
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    extra: {
      ...base.expo.extra,
      ...(apiOrigin ? { apiOrigin } : {}),
    },
  },
};
