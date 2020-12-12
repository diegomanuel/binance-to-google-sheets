/**
 * Binance to Google Sheets!
 * Diego Manuel - diegomanuel@gmail.com
 * https://github.com/diegomanuel/binance-to-google-sheets
 */


/**
 * Main formula wrapper to call supported operations.
 *
 * @param operation The operation tag to call.
 * @param range_or_cell A range of cells or a single cell or a literal/string value.
 * @param opts Additional options like the symbol/ticker to match against or an option list like "ticker: USDT, headers: false" (depending the called operation).
 * @param force_refresh_cell Cells are automatically refreshed, but you can force it by passing any changing value here.
 * @return Depends on the operation given.
 * @customfunction
 */
function BINANCE(operation, range_or_cell, opts, force_refresh_cell) {
  const options = BinUtils().parseOptions(opts);

  if (DEBUG) {
    Logger.log("OP: "+operation);
    Logger.log("RANGE: "+JSON.stringify(range_or_cell));
    Logger.log("OPTS: "+JSON.stringify(opts));
    Logger.log("OPTIONS: "+JSON.stringify(options));
  }

  if (operation == BinDoLastUpdate().tag()) {
    return BinDoLastUpdate().run();
  }
  if (operation == BinDoCurrentPrices().tag()) {
    return BinDoCurrentPrices().run(range_or_cell, options);
  }
  if (operation == BinDo24hStats().tag()) {
    return BinDo24hStats().run(range_or_cell, options);
  }
  if (operation == BinDoHistoryOrders().tag()) {
    return BinDoHistoryOrders().run(range_or_cell, options);
  }
  if (operation == BinDoDoneOrders().tag()) {
    return BinDoDoneOrders().run(range_or_cell, options);
  }
  if (operation == BinDoOpenOrders().tag()) {
    return BinDoOpenOrders().run(range_or_cell, options);
  }
  if (operation == BinDoAccountInfo().tag()) {
    return BinDoAccountInfo().run(options);
  }
  if (operation == "version") {
    return VERSION;
  }
  
  throw new Error("Unsupported operation given: '"+operation+"'");
}
