/**
 * Binance to Google Sheets!
 * Diego Calero - dcalero@fiqus.coop
 */

const VERSION = "v0.0.2-dev"
const API_KEY_NAME = "BIN_API_KEY";
const API_SECRET_NAME = "BIN_API_SECRET";
const BASE_URL = "https://api.binance.com";
const TICKER_AGAINST = "USDT"; // @TODO Give support to configure this!

/**
 * Main function that acts as a wrapper.
 *
 * @param {"prices" | "orders/open"} func What to return.
 * @param {"symbol"} options Additional options for the given operation.
 * @param refresh_cell Whatever value to force a refresh.
 * @return Depends on the func given.
 * @customfunction
 */
function BINANCE(func, options, refresh_cell) {
  if (func == "prices") {
    return BinDoCurrentPrices({
      CACHE_TTL: 60 * 2 // 2 minutes, in seconds
    }).run(options);
  }
  if (func == "24hstats") {
    return BinDo24hStats({
      CACHE_TTL: 60 * 60 // 1 hour, in seconds
    }).run(options);
  }
  if (func == "orders/all") {
    return BinDoAllOrders({
      CACHE_TTL: 60 * 5 // 5 minutes, in seconds
    }).run(options);
  }
  if (func == "orders/open") {
    return BinDoOpenOrders({
      CACHE_TTL: 60 * 2 // 2 minutes, in seconds
    }).run(options);
  }
  if (func == "last_update") {
    return BinRequest().lastUpdate();
  }
  
  throw new Error("Unsupported function given: '"+func+"'");
}






