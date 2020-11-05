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
 * @param operation The operation tag to call.
 * @param options Additional options for the given operation.
 * @param force_refresh_cell Cells are automatically refreshed, but you can force it by passing any value here.
 * @return Depends on the func given.
 * @customfunction
 */
function BINANCE(operation, options, force_refresh_cell) {
  if (operation == BinDoCurrentPrices().tag()) {
    return BinDoCurrentPrices().run(options);
  }
  if (operation == BinDo24hStats().tag()) {
    return BinDo24hStats().run(options);
  }
  if (operation == BinDoDoneOrders().tag()) {
    return BinDoDoneOrders().run(options);
  }
  if (operation == BinDoOpenOrders().tag()) {
    return BinDoOpenOrders().run(options);
  }
  if (operation == BinDoLastUpdate().tag()) {
    return BinDoLastUpdate().run();
  }
  
  throw new Error("Unsupported operation given: '"+operation+"'");
}






