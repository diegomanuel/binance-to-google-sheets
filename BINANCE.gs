/**
 * Binance to Google Sheets!
 * Diego Manuel - diegomanuel@gmail.com
 * https://github.com/diegomanuel/binance-to-google-sheets
 */

const DEBUG = false;
const VERSION = "v0.1.1";
const REPO_URL = "https://github.com/diegomanuel/binance-to-google-sheets";
const API_KEY_NAME = "BIN_API_KEY";
const API_SECRET_NAME = "BIN_API_SECRET";
const BASE_URL = "https://api.binance.com";
const TICKER_AGAINST = "USDT"; // @TODO Give support to configure this!

/**
 * Main function that acts as a wrapper.
 *
 * @param operation The operation tag to call.
 * @param range_or_cell A range of cells or a single cell or a literal/string value.
 * @param opts Additional options like the symbol/ticker to match against or an option list like "ticker: USDT, headers: false" (depending the called operation).
 * @param force_refresh_cell Cells are automatically refreshed, but you can force it by passing any changing value here.
 * @return Depends on the func given.
 * @customfunction
 */
function BINANCE(operation, range_or_cell, opts, force_refresh_cell) {
  const options = BinUtils().parseOptions(opts);

  if (operation == BinDoLastUpdate().tag()) {
    return BinDoLastUpdate().run();
  }
  if (operation == BinDoCurrentPrices().tag()) {
    return BinDoCurrentPrices().run(range_or_cell, options);
  }
  if (operation == BinDo24hStats().tag()) {
    return BinDo24hStats().run(range_or_cell, options);
  }
  if (operation == BinDoDoneOrders().tag()) {
    return BinDoDoneOrders().run(range_or_cell, options);
  }
  if (operation == BinDoOpenOrders().tag()) {
    return BinDoOpenOrders().run(range_or_cell, options);
  }
  if (operation == "version") {
    return VERSION;
  }
  
  throw new Error("Unsupported operation given: '"+operation+"'");
}
