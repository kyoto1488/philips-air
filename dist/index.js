import { PhilipsAirHomebridgePlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';
/**
 * This method registers the platform with Homebridge
 */
export default (api) => {
    api.registerPlatform(PLATFORM_NAME, PhilipsAirHomebridgePlatform);
};
//# sourceMappingURL=index.js.map