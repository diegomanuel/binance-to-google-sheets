/**
 * Runs the done orders script.
 *
 * @OnlyCurrentDoc
 */
function BinDoDoneOrders() {
  const CACHE_TTL = 60 * 5 - 10; // 4:50 minutes, in seconds
  const delay = 250; // Delay between API calls in milliseconds
  let lock_retries = 10; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/done";
  }

  /**
   * Returns this function period (the one that's used by the refresh triggers)
   */
  function period() {
    return "5m";
  }
  
  /**
   * Returns the most recent (500) filled/done orders for given symbols.
   *
   * @param {["BTC","ETH"..]} range_or_cell REQUIRED! Will fetch recent done orders for given symbols only.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT, headers: false"
   * @return The list of all current done orders for all or given symbols/tickers.
   */
  function run(range_or_cell, options) {
    const ticker_against = options["ticker"];
    Logger.log("[BinDoDoneOrders] Running..");
    if (!range_or_cell) {
      throw new Error("A range with crypto names must be given!");
    }
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return run(range_or_cell, options);
    }
    
    const range = BinUtils().getRangeOrCell(range_or_cell) || [];
    const opts = {
      CACHE_TTL,
      "retries": range.length
    };
    const data = range.reduce(function(rows, crypto) {
      const qs = "symbol="+crypto+ticker_against;
      Utilities.sleep(delay); // Add some waiting time to avoid 418 responses!
      const crypto_data = BinRequest(opts).get("api/v3/myTrades", qs, "");
      return [...crypto_data, ...rows];
    }, []);
  
    lock.releaseLock();
    const parsed = parse(data, options);
    Logger.log("[BinDoDoneOrders] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data, {headers: show_headers}) {
    const header = ["#ID", "Date", "Pair", "Type", "Side", "Price", "Amount", "Commission", "Total"];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.qty);
      const commission = BinUtils().parsePrice(order.commission);
      const row = [
        order.orderId,
        new Date(parseInt(order.time)),
        symbol,
        order.isMaker ? "LIMIT" : "STOP-LIMIT",
        order.isBuyer ? "BUY" : "SELL",
        price,
        amount,
        commission,
        price*amount
      ];
      rows.push(row);
      return rows;
    }, BinUtils().parseBool(show_headers) ? [header] : []);

    return BinUtils().sortResults(parsed, 1, true);
  }

  // Return just what's needed from outside!
  return {
    tag,
    period,
    run
  };
}