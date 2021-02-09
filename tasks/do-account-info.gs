/**
 * Runs the account info script.
 */
function BinDoAccountInfo() {
  let lock_retries = 5; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "account";
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
    return BinScheduler().getSchedule(tag()) || "15m";
  }
  
  /**
   * Returns account information for given type of wallet (or general/overview if none given).
   *
   * @param type The account wallet type to display info: -none-, "spot", "cross", "isolated"
   * @param options An option list like "headers: false"
   * @return A table with account information
   */
  function run(type, options) {
    const bs = BinScheduler();
    try {
      bs.clearFailed(tag());
      return execute(type||"overview", options);
    } catch(err) { // Re-schedule this failed run!
      bs.rescheduleFailed(tag());
      throw err;
    }
  }

  function execute(type, options) {
    Logger.log("[BinDoAccountInfo]["+type.toUpperCase()+"] Running..");
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(type, options);
    }
    
    const opts = {CACHE_TTL: 55};
    const data = request(type, opts);
  
    BinUtils().releaseLock(lock);
    const parsed = parse(type, data, options);
    Logger.log("[BinDoAccountInfo]["+type.toUpperCase()+"] Done!");
    return parsed;
  }

  function request(type, opts) {
    if (type === "overview") { // Ensure to fetch fresh data from all wallets for the overview
      BinWallet().refreshAssets();
      return; // We don't return any data here!
    }

    const br = BinRequest(opts);
    if (type.toLowerCase() === "spot") {
      return br.get("api/v3/account", "", "");
    }
    if (type.toLowerCase() === "cross") {
      return br.get("sapi/v1/margin/account", "", "");
    }
    if (type.toLowerCase() === "isolated") {
      return br.get("sapi/v1/margin/isolated/account", "", "");
    }

    throw new Error("Unsupported account wallet type: "+type);
  }

  function parse(type, data, {headers: show_headers}) {
    show_headers = BinUtils().parseBool(show_headers);

    if (type === "overview") {
      return parseOverview(show_headers);
    }
    if (type.toLowerCase() === "spot") {
      return parseSpot(data, show_headers);
    }
    if (type.toLowerCase() === "cross") {
      return parseCrossMargin(data, show_headers);
    }
    if (type.toLowerCase() === "isolated") {
      return parseIsolatedMargin(data, show_headers);
    }

    throw new Error("Unsupported account wallet type: "+type);
  }

  function parseOverview(show_headers) {
    const wallet = BinWallet();
    const headers = ["Asset", "Free", "Locked", "Borrowed", "Interest", "Total", "Net"];

    const assets = wallet.calculateAssets();
    const balances = Object.keys(assets).map(function (symbol) {
      const asset = assets[symbol];
      return [
        symbol,
        asset.free,
        asset.locked,
        asset.borrowed,
        asset.interest,
        asset.total,
        asset.net
      ];
    }, []);

    const [_, ...sorted] = BinUtils().sortResults(["placeholder", ...balances]);
    return show_headers ? [headers, ...sorted] : sorted;
  }

  function parseSpot(data, show_headers) {
    const wallet = BinWallet();
    const header1 = ["Account Type", "Maker Commission", "Taker Commission", "Buyer Commission", "Seller Commission", "Can Trade", "Can Withdraw", "Can Deposit", "Last Update"];
    const header2 = ["Asset", "Free", "Locked", "Total"];
    const account = ["Spot", data.makerCommission, data.takerCommission, data.buyerCommission, data.sellerCommission, data.canTrade, data.canWithdraw, data.canDeposit, new Date()];
    const general = show_headers ? [header1, account, header2] : [account];

    const assets = [];
    const balances = (data.balances || []).reduce(function(rows, a) {
      const asset = wallet.parseSpotAsset(a);
      if (asset.total > 0) { // Only return assets with balance
        assets.push(asset);
        rows.push([
          asset.symbol,
          asset.free,
          asset.locked,
          asset.total
        ]);
      }
      return rows;
    }, []);

    // Save assets to wallet
    wallet.setSpotAssets(assets);

    const [_, ...sorted] = BinUtils().sortResults(["placeholder", ...balances]);
    return [...general, ...sorted];
  }

  function parseCrossMargin(data, show_headers) {
    const wallet = BinWallet();
    const header1 = ["Account Type", "Trade Enabled", "Transfer Enabled", "Borrow Enabled", "Margin Level", "Total BTC Asset", "Total BTC Liability", "Total BTC Net Asset", "Last Update"];
    const header2 = ["Asset", "Free", "Locked", "Borrowed", "Interest", "Total", "Net"];
    const account = ["Cross Margin", data.tradeEnabled, data.transferEnabled, data.borrowEnabled, data.marginLevel, data.totalAssetOfBtc, data.totalLiabilityOfBtc, data.totalNetAssetOfBtc, new Date()];
    const general = show_headers ? [header1, account, header2] : [account];

    const assets = [];
    const balances = (data.userAssets || []).reduce(function(rows, a) {
      const asset = wallet.parseCrossMarginAsset(a);
      if (asset.total !== 0 || asset.net !== 0) { // Only return assets with balance
        assets.push(asset);
        rows.push([
          asset.symbol,
          asset.free,
          asset.locked,
          asset.borrowed,
          asset.interest,
          asset.total,
          asset.net
        ]);
      }
      return rows;
    }, []);

    // Save assets to wallet
    wallet.setCrossAssets(assets);

    const [_, ...sorted] = BinUtils().sortResults(["placeholder", ...balances]);
    return [...general, ...sorted];
  }

  function parseIsolatedMargin(data, show_headers) {
    const wallet = BinWallet();
    const header1 = ["Account Type", "Total BTC Asset", "Total BTC Liability", "Total BTC Net Asset", "Last Update"];
    const account = ["Isolated Margin", data.totalAssetOfBtc, data.totalLiabilityOfBtc, data.totalNetAssetOfBtc, new Date()];
    const general = show_headers ? [header1, account] : [account];

    const assets = [];
    const balances = (data.assets || []).reduce(function(rows, r) {
      if (show_headers) {
        rows.push(["Symbol", "Margin Level", "Margin Ratio", "Index Price", "Liquidate Price", "Liquidate Rate"]);
      }
      const marginLevel = parseFloat(r.marginLevel);
      const marginRatio = parseFloat(r.marginRatio);
      const indexPrice = parseFloat(r.indexPrice);
      const liquidatePrice = parseFloat(r.liquidatePrice);
      const liquidateRate = parseFloat(r.liquidateRate);
      rows.push([r.symbol, marginLevel, marginRatio, indexPrice, liquidatePrice, liquidateRate]);
      if (show_headers) {
        rows.push(["Asset", "Free", "Locked", "Borrowed", "Interest", "Total", "Net", "Net BTC"]);
      }
      const baseAsset = wallet.parseIsolatedMarginAsset(r.baseAsset);
      const quoteAsset = wallet.parseIsolatedMarginAsset(r.quoteAsset);
      assets.push(baseAsset);
      assets.push(quoteAsset);
      rows.push(parseIsolatedMarginAssetRow(baseAsset));
      rows.push(parseIsolatedMarginAssetRow(quoteAsset));
      return rows;
    }, []);

    // Save assets to wallet
    wallet.setIsolatedAssets(assets);

    return [...general, ...balances];
  }

  function parseIsolatedMarginAssetRow(asset) {
    return [
      asset.symbol,
      asset.free,
      asset.locked,
      asset.borrowed,
      asset.interest,
      asset.total,
      asset.net,
      asset.netBTC
    ];
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}