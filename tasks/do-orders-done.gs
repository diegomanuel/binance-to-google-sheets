/**
 * Runs the done orders script.
 */
function BinDoOrdersDone() {
  const max_items = 10; // How many items to be fetched for each symbol by default
  const delay = 250; // Delay between API calls in milliseconds
  let lock_retries = 5; // Max retries to acquire lock

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
   * Returns the most recent filled/done orders for given symbols (10 per symbol by default).
   *
   * @param {["BTC","ETH"..]} range_or_cell REQUIRED! Will fetch recent done orders for given symbols only.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT, headers: false, max: 100"
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

  function execute(range_or_cell, options) {
    const ticker_against = options["ticker"];
    const limit = _getMaxItems(options); // Get max items limit
    Logger.log("[BinDoOrdersDone] Running..");
    if (!range_or_cell) {
      throw new Error("A range with crypto names must be given!");
    }
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(range_or_cell, options);
    }
    
    const range = BinUtils().getRangeOrCell(range_or_cell) || [];
    const opts = {
      CACHE_TTL: 55,
      "retries": range.length
    };
    const data = range.reduce(function(rows, crypto) {
      const qs = "limit="+limit+"&symbol="+crypto+ticker_against;
      Utilities.sleep(delay); // Add some waiting time to avoid 418 responses!
      const crypto_data = BinRequest(opts).get("api/v3/myTrades", qs, "");
      return rows.concat(crypto_data);
    }, []);
  
    BinUtils().releaseLock(lock);
    const parsed = parse(data, options);
    Logger.log("[BinDoOrdersDone] Done!");
    return parsed;
  }

  function parse(data, options) {
    const header = ["#ID", "Date", "Pair", "Type", "Side", "Price", "Amount", "Commission", "Total"];
    const parsed = data.reduce(function(rows, order) {
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.qty);
      const commission = BinUtils().parsePrice(order.commission);
      const row = [
        order.orderId,
        new Date(parseInt(order.time)),
        order.symbol,
        order.isMaker ? "LIMIT" : "STOP-LIMIT",
        order.isBuyer ? "BUY" : "SELL",
        price,
        amount,
        commission,
        price*amount
      ];
      rows.push(row);
      return rows;
    }, []);

    const sorted = BinUtils().sortResults(parsed, 1, true);
    return BinUtils().parseBool(options["headers"]) ? [header, ...sorted] : sorted;
  }

  function _getMaxItems(options) {
    return Math.max(1, Math.min(1000, parseInt(options["max"]||max_items))); // Cap between 1 and 1000 items per symbol
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}