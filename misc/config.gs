/**
 * App config params.
 */

let DEBUG = false;
const VERSION = "v0.5.1";
const REPO_URL = "https://github.com/diegomanuel/binance-to-google-sheets";
const SPOT_API_URL = "https://api.binance.com";
const FUTURES_API_URL = "https://fapi.binance.com";
const TICKER_AGAINST = "USDT";
const REQUEST_RETRY_MAX_ATTEMPTS = 10; // Max number of attempts when the API responses with status != 200
const REQUEST_RETRY_DELAY = 1000; // Delay between API calls when it fails in milliseconds
