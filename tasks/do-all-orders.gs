/**
 * Generl utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinDoAllOrders(options) {
  // Sanitize options
  options = options || {
    CACHE_TTL: 60 * 5 // 5 minutes, in seconds
  };
  
  /**
   * Returns all account orders: active, canceled, or filled.
   *
   * @param ["BTC","ETH"..] range If given, returns just the matching symbols stats.
   * @return The list of all current open orders for all symbols/tickers.
   */
  function run(range) {
    Logger.log("[BinDoAllOrders/1] Running..");
    const lock = BinUtils().getLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(range);
    }
    
    const opts = {
      "filter": filter
    };
    const data = (range||[]).reduce(function(rows, crypto) {
      const qs = "symbol="+crypto+TICKER_AGAINST;
      Utilities.sleep(200); // Add some waiting time to avoid 418 responses!
      const crypto_data = BinRequest().cache(options.CACHE_TTL, "get", "api/v3/myTrades", qs, "", opts);
      return [...crypto_data, ...rows];
    }, []);
  
    lock.releaseLock();
    const parsed = parse(data);
    Logger.log("[BinDoAllOrders/1] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function filter(data) {
    return data.filter(function(order) {
      return true; // No filtering so far..
    });
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data) {
    const output = [["#ID", "Date", "Pair", "Side", "Price", "Amount", "Commission", "Total"]];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = parseFloat(order.price);
      const amount = parseFloat(order.qty);
      const commission = parseFloat(order.commission);
      const row = [
        order.orderId,
        new Date(parseInt(order.time)),
        symbol,
        order.isBuyer ? "BUY" : "SELL",
        price,
        amount,
        commission,
        price*amount
      ];
      rows.push(row);
      return rows;
    }, output);

    return BinUtils().sortResults(parsed, 1, true);
  }
  
  // Return just what's needed from outside!
  return {
    run
  };
}