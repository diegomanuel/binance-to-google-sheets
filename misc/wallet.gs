/**
 * Account wallet wrapper.
 */
function BinWallet(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options
  const WALLET_PROP_NAME = "BIN_ACCOUNT_WALLET";

  return {
    getSpotAssets,
    getCrossAssets,
    getIsolatedAssets,
    setSpotAssets,
    setCrossAssets,
    setIsolatedAssets,
    getIsolatedPairs,
    setIsolatedPairs,
    parseSpotAsset,
    parseCrossMarginAsset,
    parseIsolatedMarginAsset,
    calculateAssets,
    refreshAssets
  };

  /**
   * Returns the account wallet assets for SPOT
   */
  function getSpotAssets(symbol) {
    return getAssets("spot", symbol);
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

  function getAssets(type, symbol) {
    const data = PropertiesService.getScriptProperties().getProperty(WALLET_PROP_NAME+"_"+type.toUpperCase());
    const assets =  data ? JSON.parse(data) : {};
    return symbol ? assets[symbol] : assets;
  }

  /**
   * Sets account wallet data for SPOT
   */
  function setSpotAssets(data) {
    return setAssetsData("spot", data);
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

  function setAssetsData(type, data) {
    Logger.log("[BinWallet] Updating wallet assets for: "+type.toUpperCase());
    const assets = data.reduce(function(acc, asset) {
      return accAssetHelper(acc, asset.symbol, asset);
    }, {});

    return PropertiesService.getScriptProperties()
      .setProperty(WALLET_PROP_NAME+"_"+type.toUpperCase(), JSON.stringify(assets));
  }

  /**
   * Gets pairs data for ISOLATED MARGIN
   */
  function getIsolatedPairs(symbol) {
    const data = PropertiesService.getScriptProperties().getProperty(WALLET_PROP_NAME+"_ISOLATED_PAIRS");
    const pairs =  data ? JSON.parse(data) : {};
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

  function calculateAssets() {
    let totals = {};
    
    const spot = getSpotAssets();
    totals = Object.keys(spot).reduce(function (acc, symbol) {
      return accAssetHelper(acc, symbol, spot[symbol]);
    }, totals);
    const cross = getCrossAssets();
    totals = Object.keys(cross).reduce(function (acc, symbol) {
      return accAssetHelper(acc, symbol, cross[symbol]);
    }, totals);
    const isolated = getIsolatedAssets();
    totals = Object.keys(isolated).reduce(function (acc, symbol) {
      return accAssetHelper(acc, symbol, isolated[symbol]);
    }, totals);

    return totals;
  }

  function accAssetHelper(acc, symbol, asset) {
    acc[symbol] = {
      free: asset.free + (acc[symbol] ? acc[symbol].free : 0),
      locked: asset.locked + (acc[symbol] ? acc[symbol].locked : 0),
      borrowed: asset.borrowed + (acc[symbol] ? acc[symbol].borrowed : 0),
      interest: asset.interest + (acc[symbol] ? acc[symbol].interest : 0),
      total: asset.total + (acc[symbol] ? acc[symbol].total : 0),
      net: asset.net + (acc[symbol] ? acc[symbol].net : 0),
      netBTC: asset.netBTC + (acc[symbol] ? acc[symbol].netBTC : 0)
    };
    return acc;
  }

  /**
   * Fetches fresh data for each implemented Binance wallet so far..
   * that will be parsed and saved inside each `BinDoAccountInfo.run/2` call
   */
  function refreshAssets() {
    const accinfo = BinDoAccountInfo();
    const opts = {headers: false};
    accinfo.run("spot", opts);
    accinfo.run("cross", opts);
    accinfo.run("isolated", opts);
  }
}