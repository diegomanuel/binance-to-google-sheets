/**
 * Account wallet wrapper.
 */
function BinWallet(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options
  const WALLET_PROP_NAME = "BIN_ACCOUNT_WALLET";

  return {
    isEnabled,
    getAssets,
    getSpotAssets,
    getLendingAssets,
    getCrossAssets,
    getIsolatedAssets,
    getFuturesAssets,
    getDeliveryAssets,
    getSubAccountAssets,
    setSpotAssets,
    setLendingAssets,
    setCrossAssets,
    setIsolatedAssets,
    setFuturesAssets,
    setDeliveryAssets,
    setSubAccountAssets,
    getIsolatedPairs,
    setIsolatedPairs,
    parseSpotAsset,
    parseLendingAsset,
    parseCrossMarginAsset,
    parseIsolatedMarginAsset,
    parseFuturesAsset,
    parseFuturesPosition,
    parseSubAccountAsset,
    refreshAssets,
    clearAssets,
    calculateAssets
  };

  /**
   * Returns true if the given wallet type is currently enabled
   */
  function isEnabled(type) {
    const wallets = BinSetup().getDisabledWallets();
    return !wallets[type];
  }

  /**
   * Returns the account wallet assets for SPOT
   */
  function getSpotAssets(symbol) {
    return getAssets("spot", symbol);
  }

  /**
   * Returns the account wallet assets for LENDING (flexible earn)
   */
  function getLendingAssets(symbol) {
    return getAssets("lending", symbol);
  }

  /**
   * Returns the account wallet assets for CROSS MARGIN
   */
  function getCrossAssets(symbol) {
    return getAssets("cross", symbol);
  }

  /**
   * Returns the account wallet assets for ISOLATED MARGIN
   */
  function getIsolatedAssets(symbol) {
    return getAssets("isolated", symbol);
  }

  /**
   * Returns the account wallet assets for FUTURES USD-M
   */
  function getFuturesAssets(symbol) {
    return getAssets("futures", symbol);
  }

  /**
   * Returns the account wallet assets for FUTURES COIN-M
   */
  function getDeliveryAssets(symbol) {
    return getAssets("delivery", symbol);
  }

  /**
   * Returns the account wallet assets for SUB-ACCOUNTS
   */
  function getSubAccountAssets(symbol) {
    return getAssets("sub-accounts", symbol);
  }

  function getAssets(type, symbol) {
    const data = PropertiesService.getScriptProperties().getProperty(WALLET_PROP_NAME+"_"+type.toUpperCase());
    const assets = data ? JSON.parse(data) : {};
    return symbol ? assets[symbol] : assets;
  }

  /**
   * Sets account wallet data for SPOT
   */
  function setSpotAssets(data) {
    return setAssetsData("spot", data);
  }

  /**
   * Sets account wallet data for LENDING (flexible earn)
   */
  function setLendingAssets(data) {
    return setAssetsData("lending", data);
  }

  /**
   * Sets account wallet data for CROSS MARGIN
   */
  function setCrossAssets(data) {
    return setAssetsData("cross", data);
  }

  /**
   * Sets account wallet data for ISOLATED MARGIN
   */
  function setIsolatedAssets(data) {
    return setAssetsData("isolated", data);
  }

  /**
   * Sets account wallet data for FUTURES USD-M
   */
  function setFuturesAssets(data) {
    return setAssetsData("futures", data);
  }

  /**
   * Sets account wallet data for FUTURES COIN-M
   */
  function setDeliveryAssets(data) {
    return setAssetsData("delivery", data);
  }

  /**
   * Sets account wallet data for SUB-ACCOUNTS
   */
  function setSubAccountAssets(data) {
    return setAssetsData("sub-accounts", data);
  }

  function setAssetsData(type, data) {
    Logger.log("[BinWallet] Updating wallet assets for: "+type.toUpperCase());
    const assets = data.reduce(function(acc, asset) {
      return _accAssetHelper(acc, asset.symbol, asset);
    }, {});

    return PropertiesService.getScriptProperties()
      .setProperty(WALLET_PROP_NAME+"_"+type.toUpperCase(), JSON.stringify(assets));
  }

  /**
   * Gets pairs data for ISOLATED MARGIN
   */
  function getIsolatedPairs(symbol) {
    const data = PropertiesService.getScriptProperties().getProperty(WALLET_PROP_NAME+"_ISOLATED_PAIRS");
    const pairs = data ? JSON.parse(data) : {};
    return symbol ? pairs[symbol] : pairs;
  }

  /**
   * Sets pairs data for ISOLATED MARGIN
   */
  function setIsolatedPairs(data) {
    const pairs = data.reduce(function(acc, pair) {
      acc[pair.symbol] = pair;
      return acc;
    }, {});

    return PropertiesService.getScriptProperties()
      .setProperty(WALLET_PROP_NAME+"_ISOLATED_PAIRS", JSON.stringify(pairs));
  }

  function parseSpotAsset(asset) {
    const free = parseFloat(asset.free);
    const locked = parseFloat(asset.locked);
    return {
      symbol: asset.asset,
      free,
      locked,
      borrowed: 0,
      interest: 0,
      total: free + locked,
      net: free + locked,
      netBTC: 0 // Missing!
    };
  }

  function parseLendingAsset(asset) {
    const amount = parseFloat(asset.amount);
    const netBTC = parseFloat(asset.amountInBTC);
    return {
      symbol: asset.asset,
      free: 0,
      locked: amount,
      borrowed: 0,
      interest: 0,
      total: amount,
      net: amount,
      netBTC: netBTC
    };
  }

  function parseCrossMarginAsset(asset) {
    const free = parseFloat(asset.free);
    const locked = parseFloat(asset.locked);
    return {
      symbol: asset.asset,
      free,
      locked,
      borrowed: parseFloat(asset.borrowed),
      interest: parseFloat(asset.interest),
      total: free + locked,
      net: parseFloat(asset.netAsset),
      netBTC: 0 // Missing!
    };
  }

  function parseIsolatedMarginAsset(asset) {
    return {
      symbol: asset.asset,
      free: parseFloat(asset.free),
      locked: parseFloat(asset.locked),
      borrowed: parseFloat(asset.borrowed),
      interest: parseFloat(asset.interest),
      total: parseFloat(asset.totalAsset),
      net: parseFloat(asset.netAsset),
      netBTC: parseFloat(asset.netAssetOfBtc)
    };
  }

  function parseFuturesAsset(asset) {
    const total = parseFloat(asset.walletBalance);
    const free = parseFloat(asset.availableBalance);
    return {
      symbol: asset.asset,
      free,
      locked: total - free,
      borrowed: 0,
      interest: 0,
      total,
      net: total,
      netBTC: 0,
      initialMargin: parseFloat(asset.initialMargin),
      maintMargin: parseFloat(asset.maintMargin),
      unrealizedProfit: parseFloat(asset.unrealizedProfit),
      walletBalance: total,
      marginBalance: parseFloat(asset.marginBalance),
      crossWalletBalance: parseFloat(asset.crossWalletBalance),
      availableBalance: free,
      maxWithdrawAmount: parseFloat(asset.maxWithdrawAmount)
    };
  }

  function parseFuturesPosition(position) {
    return {
      pair: position.symbol,
      side: position.positionSide,
      leverage: parseFloat(position.leverage),
      entry: parseFloat(position.entryPrice),
      amount: parseFloat(position.positionAmt),
      notional: parseFloat(position.notional),
      maxNotional: parseFloat(position.maxNotional),
      unpnl: parseFloat(position.unrealizedProfit),
      isolated: position.isolated,
      isolatedWallet: parseFloat(position.isolatedWallet),
      initialMargin: parseFloat(position.initialMargin),
      maintMargin: parseFloat(position.maintMargin),
      positionInitialMargin: parseFloat(position.positionInitialMargin),
      openOrderInitialMargin: parseFloat(position.openOrderInitialMargin)
    };
  }

  function parseSubAccountAsset(asset) {
    const free = parseFloat(asset.free);
    const locked = parseFloat(asset.locked);
    return {
      symbol: asset.asset,
      free,
      locked,
      borrowed: 0,
      interest: 0,
      total: free + locked,
      net: free + locked,
      netBTC: 0 // Missing!
    };
  }

  /**
   * Refreshes the assets from ALL supported/available wallets
   */
  function refreshAssets(exclude_sub_accounts) {
    return BinDoAccountInfo().refresh(exclude_sub_accounts);
  }

  /**
   * Clears all the assets for the given wallet type
   */
  function clearAssets(type) {
    return setAssetsData(type, []);
  }

  /**
   * Returns a summary object whose keys are the asset name/symbol
   * and the values are the sum of each asset from all implemented wallets
   */
  function calculateAssets(exclude_sub_accounts) {
    let totals = {};
    
    const spot = getSpotAssets();
    totals = Object.keys(spot).reduce(function(acc, symbol) {
      return _accAssetHelper(acc, symbol, spot[symbol]);
    }, totals);
    const lending = getLendingAssets();
    totals = Object.keys(lending).reduce(function(acc, symbol) {
      return _accAssetHelper(acc, "LEND"+symbol, lending[symbol]);
    }, totals);
    if (isEnabled("cross")) {
      const cross = getCrossAssets();
      totals = Object.keys(cross).reduce(function(acc, symbol) {
        return _accAssetHelper(acc, symbol, cross[symbol]);
      }, totals);
    }
    if (isEnabled("isolated")) {
      const isolated = getIsolatedAssets();
      totals = Object.keys(isolated).reduce(function(acc, symbol) {
        return _accAssetHelper(acc, symbol, isolated[symbol]);
      }, totals);
    }
    if (isEnabled("futures")) {
      const futures = getFuturesAssets();
      totals = Object.keys(futures).reduce(function(acc, symbol) {
        return _accAssetHelper(acc, symbol, futures[symbol]);
      }, totals);
    }
    if (isEnabled("delivery")) {
      const delivery = getDeliveryAssets();
      totals = Object.keys(delivery).reduce(function(acc, symbol) {
        return _accAssetHelper(acc, symbol, delivery[symbol]);
      }, totals);
    }
    if (!exclude_sub_accounts) { // Include sub-account assets
      const subaccs = getSubAccountAssets();
      totals = Object.keys(subaccs).reduce(function(acc, symbol) {
        return _accAssetHelper(acc, symbol, subaccs[symbol]);
      }, totals);
    }

    return totals;
  }

  function _accAssetHelper(acc, symbol, asset) {
    acc[symbol] = {
      free: (asset.free||0) + (acc[symbol] ? acc[symbol].free : 0),
      locked: (asset.locked||0) + (acc[symbol] ? acc[symbol].locked : 0),
      borrowed: (asset.borrowed||0) + (acc[symbol] ? acc[symbol].borrowed : 0),
      interest: (asset.interest||0) + (acc[symbol] ? acc[symbol].interest : 0),
      total: (asset.total||0) + (acc[symbol] ? acc[symbol].total : 0),
      net: (asset.net||0) + (acc[symbol] ? acc[symbol].net : 0),
      netBTC: (asset.netBTC||0) + (acc[symbol] ? acc[symbol].netBTC : 0)
    };
    return acc;
  }
}