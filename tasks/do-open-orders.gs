/**
 * Generl utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinDoOpenOrders(options) {
  // Sanitize options
  options = options || {
    CACHE_TTL: 60 * 2 // 2 minutes, in seconds
  };
  
  /**
   * Returns current open oders.
   *
   * @param {"BTCUSDT|..."} symbol If given, returns just the matching symbol open orders.
   * @return The list of all current open orders for all symbols/tickers.
   */
  function run(symbol) {
    Logger.log("[BinDoOpenOrders/1] Running..");
    const lock = BinUtils().getLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(symbol);
    }
    
    const opts = {
      "filter": !symbol ? null : function(data) {
        return filter(data, symbol);
      }
    };
    const data = BinRequest().cache(options.CACHE_TTL, "get", "api/v3/openOrders", "", "", opts);
  
    lock.releaseLock();
    const parsed = parse(data);
    Logger.log("[BinDoOpenOrders/1] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function filter(data, symbol) {
    return data.filter(function(ticker) {
      return ticker.symbol == symbol;
    });
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data) {
    const output = [["Date", "Pair", "Type", "Side", "Price", "Amount", "Executed", "Total"]];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = parseFloat(order.price);
      const amount = parseFloat(order.origQty);
      const row = [
        new Date(parseInt(order.time)),
        symbol,
        order.type,
        order.side,
        price,
        amount,
        parseFloat(order.executedQty),
        price*amount
      ];
      rows.push(row);
      return rows;
    }, output);

    return BinUtils().sortResults(parsed, 0, true);
  }
  
  // Return just what's needed from outside!
  return {
    run
  };
}