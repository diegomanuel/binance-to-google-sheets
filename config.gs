/**
 * Binance to Google Sheets!
 * Diego Manuel - diegomanuel@gmail.com
 * https://github.com/diegomanuel/binance-to-google-sheets
 * https://github.com/diegomanuel/binance-to-google-sheets-proxy
 */

/**
 * Add-on config params.
 * You should only need to adjust the `USE_PROXY` value!
 */

// Proxy usage
const USE_PROXY = false;
// See: https://github.com/diegomanuel/binance-to-google-sheets-proxy
//const USE_PROXY = "https://btgs-proxy.setupme.io"

// Other settings
let DEBUG = false; // If enabled, will output more logs to the AppScript console
const VERSION = "v0.6.0";
const REPO_URL = "https://github.com/diegomanuel/binance-to-google-sheets";
const SPOT_API_URL = "https://api.binance.com";
const FUTURES_API_URL = "https://fapi.binance.com";
const DELIVERY_API_URL = "https://dapi.binance.com";
const TICKER_AGAINST = "USDT"; // The default base cryptocurrency to build a full ticker
const REQUEST_RETRY_MAX_ATTEMPTS = 10; // Max number of attempts when the API responses with status != 200
const REQUEST_RETRY_DELAY = 1000; // Delay between API calls when it fails in milliseconds
