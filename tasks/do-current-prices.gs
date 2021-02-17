/**
 * Runs the current prices script.
 */
function BinDoCurrentPrices() {
  let lock_retries = 5; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "prices";
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
    return BinScheduler().getSchedule(tag()) || "1m";
  }
  
  /**
   * Returns current market prices.
   *
   * @param {["BTC","ETH"..]} symbol_or_range If given, returns just the matching symbol price or range prices. If not given, returns all the prices.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT, headers: false"
   * @return The list of current prices for all or given symbols/tickers.
   */
  function run(symbol_or_range, options) {
    const bs = BinScheduler();
    try {
      bs.clearFailed(tag());
      return execute(symbol_or_range, options);
    } catch(err) { // Re-schedule this failed run!
      bs.rescheduleFailed(tag());
      throw err;
    }
  }

  function execute(symbol_or_range, options) {
    Logger.log("[BinDoCurrentPrices] Running..");
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(symbol_or_range, options);
    }

    const opts = {CACHE_TTL: 55, "public": true};
    const data = new BinRequest(opts).get("api/v3/ticker/price", "", "");
    BinUtils().releaseLock(lock);
    const parsed = parse(data, symbol_or_range, options);
    Logger.log("[BinDoCurrentPrices] Done!");
    return parsed;
  }

  function parse(data, symbol_or_range, {ticker: ticker_against, headers: show_headers, prices: prices_only}) {
    prices_only = BinUtils().parseBool(prices_only, false);
    show_headers = BinUtils().parseBool(show_headers);
    const header = ["Symbol", "Price"];
    const tickers = symbol_or_range ? BinUtils().filterTickerSymbol(data, symbol_or_range, ticker_against) : data;
    if (typeof symbol_or_range == "string" && symbol_or_range) { // A single value to return
      return BinUtils().parsePrice(((tickers||[{}])[0]||{}).price);
    }

    // Multiple rows to return
    const parsed = tickers.reduce(function(rows, ticker) {
      const price = BinUtils().parsePrice(ticker.price);
      const row = prices_only ? price : [ticker.symbol, price];
      rows.push(row);
      return rows;
    }, []);

    if (prices_only) { // Return as it is if we only want to display prices
      return parsed;
    }
    if (symbol_or_range) { // Return as it is if we have a symbol or range to display
      return show_headers ? [header, ...parsed] : parsed;
    }
    // Return sorted results
    const sorted = BinUtils().sortResults(parsed);
    return show_headers ? [header, ...sorted] : sorted;
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}