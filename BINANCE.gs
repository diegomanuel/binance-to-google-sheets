/**
 * Binance to Google Sheets!
 * Diego Manuel - diegomanuel@gmail.com
 */

const DEBUG = false;
const VERSION = "v0.1.0";
const REPO_URL = "https://github.com/diegomanuel/binance-to-google-sheets";
const API_KEY_NAME = "BIN_API_KEY";
const API_SECRET_NAME = "BIN_API_SECRET";
const BASE_URL = "https://api.binance.com";
const TICKER_AGAINST = "USDT"; // @TODO Give support to configure this!

/**
 * Initialization on document open.
 */
function onOpen(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  const auth_mode = event && event.authMode ? event.authMode : ScriptApp.AuthMode.NONE;
  BinMenu(SpreadsheetApp.getUi(), auth_mode); // Add items to main menu
  if (BinUtils().isAuthEnough(auth_mode)) {
    BinSetup().configTrigger(); // Automatically keep the formulas updated!
  }

  Logger.log("Welcome to 'Binance to Google Sheets' by Diego Manuel, enjoy!  =]");
}

/**
 * Initialization on add-on install.
 */
function onInstall(event) {
  Logger.log("Binance to Google Sheets was installed!");
  onOpen(event);
}

/**
 * Main function that acts as a wrapper.
 *
 * @param operation The operation tag to call.
 * @param range_or_cell A range of cells or a single sell or value
 * @param force_refresh_cell Cells are automatically refreshed, but you can force it by passing any value here.
 * @return Depends on the func given.
 * @customfunction
 */
function BINANCE(operation, range_or_cell, additional_opts, force_refresh_cell) {
  if (operation == BinDoLastUpdate().tag()) {
    return BinDoLastUpdate().run();
  }
  if (operation == BinDoCurrentPrices().tag()) {
    return BinDoCurrentPrices().run(range_or_cell, additional_opts);
  }
  if (operation == BinDo24hStats().tag()) {
    return BinDo24hStats().run(range_or_cell, additional_opts);
  }
  if (operation == BinDoDoneOrders().tag()) {
    return BinDoDoneOrders().run(range_or_cell, additional_opts);
  }
  if (operation == BinDoOpenOrders().tag()) {
    return BinDoOpenOrders().run(range_or_cell);
  }
  if (operation == "version") {
    return VERSION;
  }
  
  throw new Error("Unsupported operation given: '"+operation+"'");
}
