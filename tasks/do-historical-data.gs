/**
 * Runs the historical data script.
 * 
 * Thanks to @almeidaaraujo (https://github.com/almeidaaraujo) for his first approach!
 * PR: https://github.com/diegomanuel/binance-to-google-sheets/pull/22
 * Issue: https://github.com/diegomanuel/binance-to-google-sheets/issues/21
 */
function BinDoHistoricalData() {
  let lock_retries = 5; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "history";
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
    return BinScheduler().getSchedule(tag()) || "10m";
  }

  /**
   * Returns historical market OHLCV data for a single given symbol/ticker.
   *
   * @param symbol REQUIRED! A full symbol/ticker to get its data.
   * @param options An option list string like "interval: $interval, start: $start, end: $end, limit: $l, headers: false"
   *                      $interval: 1m, 5m, 1h, 1d, 1w, ... (defaults to: 1h)
   *                      $start: 2021-01-01 00:00 (with or without time given, defaults to: none/no-time)
   *                      $end: 2021-03-01 (with or without time given, defaults to: none/no-time)
   *                      $l: from 1 to 1000 (max items set by Binance, defaults to: 500)
   * @return The list of OHLCV data.
   */
  function run(symbol, options) {
    Logger.log("[BinDoHistoricalData] Running..");
    if (!symbol) {
      throw new Error("A full symbol/ticker like 'BTCUSDT' must be given!");
    }

    const bs = BinScheduler();
    try {
      bs.clearFailed(tag());
      const data = execute(symbol, options);
      Logger.log("[BinDoHistoricalData] Done!");
      return data;
    } catch(err) { // Re-schedule this failed run!
      bs.rescheduleFailed(tag());
      throw err;
    }
  }

  function execute(symbol, options) {
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(symbol, options);
    }

    const {interval, start, end, limit} = options;
    const qs = ["symbol="+symbol];
    qs.push("interval="+(interval||"1h"));
    if (start) {
      qs.push("startTime="+(BinUtils().parseDate(start).getTime()));
    }
    if (end) {
      qs.push("endTime="+(BinUtils().parseDate(end).getTime()));
    }
    if (limit) {
      qs.push("limit="+Math.max(1, Math.min(1000, parseInt(limit))));
    }

    const opts = {"no_cache_ok": true, retries: 20, public: true};
    const data = new BinRequest(opts).get("api/v3/klines", qs.join("&"));
    BinUtils().releaseLock(lock);
    return parse(data, options);
  }

  function parse(data, options) {
    // Each row has the following data:
    // [
    //   1499040000000,      // Open time
    //   "0.01634790",       // Open
    //   "0.80000000",       // High
    //   "0.01575800",       // Low
    //   "0.01577100",       // Close
    //   "148976.11427815",  // Volume
    //   1499644799999,      // Close time
    //   "2434.19055334",    // Quote asset volume
    //   308,                // Number of trades
    //   "1756.87402397",    // Taker buy base asset volume
    //   "28.46694368",      // Taker buy quote asset volume
    //   "17928899.62484339" // Ignore.
    // ]
    const show_headers = BinUtils().parseBool(options.headers);
    const header = ["Open Time", "Open", "High", "Low", "Close", "Close Time", "Volume", "Trades"];
    const parsed = data.reduce(function(rows, d) {
      const row = [
        new Date(parseInt(d[0])),
        parseFloat(d[1]),
        parseFloat(d[2]),
        parseFloat(d[3]),
        parseFloat(d[4]),
        new Date(parseInt(d[6])),
        parseFloat(d[5]),
        parseInt(d[7])
      ];
      return rows.concat([row]);
    }, []);

    Logger.log("[BinDoHistoricalData] Returning "+parsed.length+" rows..");
    return show_headers ? [header, ...parsed] : parsed;
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}