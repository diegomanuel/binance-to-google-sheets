/**
 * Runs the historical data script.
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
   * Returns current market prices.
   *
   * @param {price or volume} return data If given, returns just the data price or volume. If not given, returns price history.
   * @param options { symbol: $symbol, interval: $interval (5m, 1h, 1d, 1w, ...), startTime: $timestamp , endTime: $timestamp }
   * @return The list of data selected.
   */
  function run(historicalType, options) {
    const bs = BinScheduler();
    try {
      bs.clearFailed(tag());
      return execute(historicalType, options);
    } catch(err) { // Re-schedule this failed run!
      bs.rescheduleFailed(tag());
      throw err;
    }
  }

  function execute(historicalType, options) {
    Logger.log("[BinDoHistoryPrices] Running..");
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(historicalType, options);
    }

    const opts = {CACHE_TTL: 55, "public": true};
    const {symbol, interval, startTime, endTime} = options;
   
    const qs = "symbol="+symbol+"&interval="+interval+"&startTime="+startTime+"&endTime="+endTime;
    const data = new BinRequest(opts).get("api/v3/klines",qs);
    
    BinUtils().releaseLock(lock);
    const parsed = parse(data, historicalType, options);
    Logger.log("[BinDoCurrentPrices] Done!");
    return parsed;
  }

  function parse(data, historicalType, {symbol: symb, interval: inter, startTime: time1, endTime: time2}) {
       
    // Multiple rows to return
    const parsed = data.reduce(function(rows, ticker) {
      const price = BinUtils().parsePrice(ticker[4]);
      if(historicalType== "" || historicalType == "price" ){
        value = BinUtils().parsePrice(ticker[4]);
      }
 
      if(historicalType == "volume" ){
        value = BinUtils().parsePrice(ticker[5]);
      }
      const row = value;
      rows.push(row);
      return rows;
    }, []);
    return parsed;
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}