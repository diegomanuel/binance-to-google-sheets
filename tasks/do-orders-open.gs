/**
 * Runs the open orders script.
 */
function BinDoOrdersOpen() {
  let lock_retries = 5; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/open";
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
   * Returns current open oders.
   *
   * @param {["BTC","ETH"..]} range_or_cell If given, will filter by given symbols (regexp).
   * @param options Ticker to match against (none by default) or an option list like "ticker: USDT, headers: false"
   * @return A list of current open orders for given criteria.
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
    const ticker_against = options["ticker"] || "";
    Logger.log("[BinDoOrdersOpen] Running..");
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(range_or_cell, options);
    }

    let data = fetch();
    BinUtils().releaseLock(lock);
    Logger.log("[BinDoOrdersOpen] Found "+data.length+" orders to display.");
    const range = BinUtils().getRangeOrCell(range_or_cell);
    if (range.length) { // Apply filtering
      const pairs = range.map(symbol => new RegExp(symbol+ticker_against, "i"));
      data = data.filter(row => pairs.find(pair => pair.test(row.symbol)));
      Logger.log("[BinDoOrdersOpen] Filtered to "+data.length+" orders.");
    }

    const parsed = parse(data, options);
    Logger.log("[BinDoOrdersOpen] Done!");
    return parsed;
  }

  function fetch() {
    const bw = BinWallet();
    const opts = {CACHE_TTL: 55, "discard_40x": true}; // Discard 40x errors for disabled wallets!
    const dataSpot = fetchSpotOrders(opts); // Get all SPOT orders
    const dataCross = bw.isEnabled("cross") ? fetchCrossOrders(opts) : []; // Get all CROSS MARGIN orders
    const dataIsolated = bw.isEnabled("isolated") ? fetchIsolatedOrders(opts) : []; // Get all ISOLATED MARGIN orders
    const dataFutures = bw.isEnabled("futures") ? fetchFuturesOrders(opts) : []; // Get all FUTURES orders
    return [...dataSpot, ...dataCross, ...dataIsolated, ...dataFutures];
  }

  function fetchSpotOrders(opts) {
    Logger.log("[BinDoOrdersOpen][SPOT] Fetching orders..");
    const orders = new BinRequest(opts).get("api/v3/openOrders");
    return orders.map(function(order) {
      order.market = "SPOT";
      return order;
    });
  }

  function fetchCrossOrders(opts) {
    Logger.log("[BinDoOrdersOpen][CROSS] Fetching orders..");
    const orders = new BinRequest(opts).get("sapi/v1/margin/openOrders") || []; //  It may fail if wallet isn't enabled!
    return orders.map(function(order) {
      order.market = "CROSS";
      return order;
    });
  }

  function fetchIsolatedOrders(opts) {
    const wallet = BinWallet();
    const symbols = Object.keys(wallet.getIsolatedPairs());
    return symbols.reduce(function(acc, symbol) {
      Logger.log("[BinDoOrdersOpen][ISOLATED] Fetching orders for '"+symbol+"' pair..");
      const qs = "isIsolated=true&symbol="+symbol;
      const orders = new BinRequest(opts).get("sapi/v1/margin/openOrders", qs) || []; //  It may fail if wallet isn't enabled!
      const data = orders.map(function(order) {
        order.market = "ISOLATED";
        return order;
      });
      return [...acc, ...data];
    }, []);
  }

  function fetchFuturesOrders(opts) {
    Logger.log("[BinDoOrdersOpen][FUTURES] Fetching orders..");
    const options = Object.assign({futures: true}, opts);
    const orders = new BinRequest(options).get("fapi/v1/openOrders") || []; //  It may fail if wallet isn't enabled!
    return orders.map(function(order) {
      order.market = "FUTURES";
      return order;
    });
  }

  function parse(data, {headers: show_headers}) {
    const bu = BinUtils();
    const header = ["Date", "Pair", "Market", "Type", "Side", "Price", "Amount", "Executed", "Total"];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = parseFloat(order.price) ? bu.parsePrice(order.price) : bu.parsePrice(order.stopPrice);
      const amount = parseFloat(order.origQty);
      const row = [
        new Date(parseInt(order.time)),
        symbol,
        order.market,
        order.type,
        order.side,
        price,
        amount,
        parseFloat(order.executedQty),
        price*amount
      ];
      rows.push(row);
      return rows;
    }, []);

    const sorted = BinUtils().sortResults(parsed, 0, true);
    return BinUtils().parseBool(show_headers) ? [header, ...sorted] : sorted;
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}