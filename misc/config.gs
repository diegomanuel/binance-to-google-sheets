/**
 * App config params.
 */

let DEBUG = false;
const VERSION = "v0.4.2";
const REPO_URL = "https://github.com/diegomanuel/binance-to-google-sheets";
const BASE_URL = "https://api.binance.com";
const TICKER_AGAINST = "USDT";
const REQUEST_RETRY_MAX_ATTEMPTS = 10; // Max number of attempts when the API responses with status != 200
const REQUEST_RETRY_DELAY = 1000; // Delay between API calls when it fails in milliseconds
