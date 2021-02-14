/**
 * Runs the done orders script.
 */
function BinDoOrdersDone() {
  const max_items = 100; // How many items to be displayed by default

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/done";
  }

  /**
   * Returns true if the given operation belongs to this code
   */
  function is(operation) {
    return operation === tag();
  }

  /**
   * Returns this function period (the one that's used by the refresh triggers)
   */
  function period() {
    return BinScheduler().getSchedule(tag()) || "5m";
  }
  
  /**
   * Returns the most recent filled/done orders (100 by default) from ALL sheets that are "order tables" in the spreadsheet
   * NOTE: It requires at least ONE sheet with the 'orders/table' operation in it!
   * @TODO Add support to filter by `range_or_cell` and/or `ticker` option!
   *
   * @param {["BTC","ETH"..]} range_or_cell Will fetch recent done orders for given symbols only.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT, headers: false, max: 0"
   * @return The list of all current done orders for all or given symbols/tickers.
   */
  function run(range_or_cell, options) {
    const bs = BinScheduler();
    try {
      bs.clearFailed(tag());
      return execute(range_or_cell, options);
    } catch(err) { // Re-schedule this failed run!
      bs.rescheduleFailed(tag());
      throw err;
    }
  }

  // @TODO Implement `range_or_cell` and/or `ticker` filtering
  function execute(range_or_cell, options) {
    // const ticker_against = options["ticker"];
    Logger.log("[BinDoOrdersDone] Running..");
    
    // const range = BinUtils().getRangeOrCell(range_or_cell) || [];
    // const data = range.reduce(function(rows, asset) {
    //   return rows.concat(asset);
    // }, []);
    // const parsed = parse(data, options);

    // Get ALL the rows contained in ALL defined sheets as order tables!
    const data = BinDoOrdersTable().getRows();
    if (!data.length) {
      console.error("[BinDoOrdersDone] It seems that we didn't find any sheet in the spreadsheet with the 'orders/table' operation in it!");
      return [["- no results to display - WARNING: This operation requires at least ONE sheet in the spreadsheet with the 'orders/table' operation in it!"]];
    }
    const parsed = parse(data, options);
    Logger.log("[BinDoOrdersDone] Returning "+data.length+" orders..");
    Logger.log("[BinDoOrdersDone] Done!");
    return parsed;
  }

  function parse(data, options) {
    const header = ["Order #ID", "Date", "Pair", "Type", "Side", "Price", "Amount", "Commission", "Total"];
    const parsed = data.map(function(order) {
      order.shift(); // Remove the first column (Trade #ID)
      return order;
    });
    let sorted = BinUtils().sortResults(parsed, 1, true);
    const limit = parseInt(options["max"]||max_items); // Max items to display
    if (limit > 0 && limit < sorted.length) {
      sorted = sorted.slice(0, limit);
    }
    return BinUtils().parseBool(options["headers"]) ? [header, ...sorted] : sorted;
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}