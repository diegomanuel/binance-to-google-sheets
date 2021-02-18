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
    return BinScheduler().getSchedule(tag()) || "10m";
  }

  /**
   * Schedules this operation to be run in the next "1m" trigger
   */
  function schedule() {
    return BinScheduler().rescheduleFailed(tag());
  }

  /**
   * Fetches fresh data for each implemented Binance wallet so far..
   * that will be parsed and saved inside each `run/2` call.
   */
  function refresh(exclude_sub_accounts) {
    const opts = {headers: false};
    run("spot", opts);
    run("cross", opts);
    run("isolated", opts);
    if (!exclude_sub_accounts) { // Include sub-account assets
      run("sub", opts);
    }
  }

  /**
   * Gets the list of ALL sub-accounts
   */
  function listSubAccounts() {
    const data = new BinRequest().get("wapi/v3/sub-account/list.html");
    return data && data.subAccounts ? data.subAccounts : [];
  }

  /**
   * Returns account information for given type of wallet (or general/overview if none given).
   *
   * @param type The account wallet type to display info: -none-, "spot", "cross", "isolated"
   * @param options An option list like "headers: false"
   * @return A table with account information
   */
  function run(type, options) {
    try {
      BinScheduler().clearFailed(tag());
      return execute(type||"overview", options);
    } catch(err) { // Re-schedule this failed run!
      schedule();
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

  // @TODO Add filter for empty assets (balance=0) at BinRequest().get() options
  function request(type, opts) {
    if (type === "overview") { // Ensure to fetch fresh data from all wallets for the overview
      refresh();
      return; // We don't return any data here!
    }

    const br = new BinRequest(opts);
    if (type.toLowerCase() === "spot") {
      return br.get("api/v3/account", "", "");
    }
    if (type.toLowerCase() === "cross") {
      return br.get("sapi/v1/margin/account", "", "");
    }
    if (type.toLowerCase() === "isolated") {
      return br.get("sapi/v1/margin/isolated/account", "", "");
    }
    if (type.toLowerCase() === "sub") {
      return _requestSubAccounts(opts);
    }

    throw new Error("Unsupported account wallet type: "+type);
  }

  function _requestSubAccounts(opts) {
    const subaccs = BinSetup().getSubAccounts();
    
    return Object.keys(subaccs).reduce(function(assets, email) {
      const qs = "email="+email;
      const data = new BinRequest(opts).get("wapi/v3/sub-account/assets.html", qs);
      assets[email] = (data||{}).balances || [];
      return assets;
    }, {});
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
    if (type.toLowerCase() === "sub") {
      return parseSubAccounts(data, show_headers);
    }

    throw new Error("Unsupported account wallet type: "+type);
  }

  function parseOverview(show_headers) {
    const headers = ["Asset", "Free", "Locked", "Borrowed", "Interest", "Total", "Net"];
    const assets = BinWallet().calculateAssets(); // Calculate assets from ALL implemented/available wallets!
    const balances = Object.keys(assets).map(function(symbol) {
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

    const sorted = BinUtils().sortResults(balances);
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

    const sorted = BinUtils().sortResults(balances);
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

    const sorted = BinUtils().sortResults(balances);
    return [...general, ...sorted];
  }

  function parseIsolatedMargin(data, show_headers) {
    const wallet = BinWallet();
    const header1 = ["Account Type", "Total BTC Asset", "Total BTC Liability", "Total BTC Net Asset", "Last Update"];
    const account = ["Isolated Margin", data.totalAssetOfBtc, data.totalLiabilityOfBtc, data.totalNetAssetOfBtc, new Date()];
    const general = show_headers ? [header1, account] : [account];

    const pairs = [];
    const assets = [];
    const balances = (data.assets || []).reduce(function(rows, a) {
      pairs.push(a); // Add isolated pair to wallet
      if (show_headers) {
        rows.push(["Symbol", "Margin Level", "Margin Ratio", "Index Price", "Liquidate Price", "Liquidate Rate"]);
      }
      const marginLevel = parseFloat(a.marginLevel);
      const marginRatio = parseFloat(a.marginRatio);
      const indexPrice = parseFloat(a.indexPrice);
      const liquidatePrice = parseFloat(a.liquidatePrice);
      const liquidateRate = parseFloat(a.liquidateRate);
      rows.push([a.symbol, marginLevel, marginRatio, indexPrice, liquidatePrice, liquidateRate]);
      if (show_headers) {
        rows.push(["Asset", "Free", "Locked", "Borrowed", "Interest", "Total", "Net", "Net BTC"]);
      }
      const baseAsset = wallet.parseIsolatedMarginAsset(a.baseAsset);
      const quoteAsset = wallet.parseIsolatedMarginAsset(a.quoteAsset);
      assets.push(baseAsset); // Add base asset to wallet
      assets.push(quoteAsset); // Add quote asset to wallet
      rows.push(parseIsolatedMarginAssetRow(baseAsset));
      rows.push(parseIsolatedMarginAssetRow(quoteAsset));
      return rows;
    }, []);

    // Save isolated pairs and assets to wallet
    wallet.setIsolatedPairs(pairs);
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

  function parseSubAccounts(data, show_headers) {
    const wallet = BinWallet();
    const subaccs = BinSetup().getSubAccounts();
    const emails = Object.keys(subaccs);
    const headers = [
      ["Account Type", "Added Accounts", "Last Update"],
      ["Sub-Accounts", emails.length, new Date()]
    ];
    const general = show_headers ? headers : [];
    if (!emails.length) {
      general.push(["You have to add at least one sub-account email from 'Binance' main menu!"]);
    }

    const assets = [];
    const balances = Object.keys(data).reduce(function(rows, email) {
      const subbalances = (data[email]||[]).reduce(function(subrows, a) {
        const asset = wallet.parseSubAccountAsset(a);
        if (asset.total > 0) { // Only return assets with balance
          assets.push(asset);
          subrows.push([
            asset.symbol,
            asset.free,
            asset.locked,
            asset.total
          ]);
        }
        return subrows;
      }, []);

      if (show_headers) {
        rows.push(["Sub-Account Email", "", "", "Assets"]);
      }
      rows.push([email, "", "", subbalances.length]);
      if (show_headers) {
        rows.push(["Asset", "Free", "Locked", "Total"]);
      }

      const sorted = BinUtils().sortResults(subbalances);
      return rows.concat(sorted);
    }, []);

    // Save assets to wallet
    wallet.setSubAccountAssets(assets);

    return [...general, ...balances];
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    schedule,
    refresh,
    listSubAccounts,
    run
  };
}