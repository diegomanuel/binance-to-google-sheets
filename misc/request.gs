/**
 * API client wrapper.
 */
function BinRequest(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options
  const CACHE_TTL = OPTIONS["CACHE_TTL"] || false; // Cache disabled by default
  const retry_delay = 1000; // Delay between API calls when it fails in milliseconds
  const retry_max_attempts = 5; // Max number of attempts when the API responses with status != 200

  return {
    get
  };

  /**
   * Reads data from cache or Binance API with a GET request
   */
  function get(url, qs, payload) {
    return _fetch("get", url, qs, payload);
  }

  /**
   * Reads data from cache or Binance API
   */
  function _fetch(method, url, qs, payload) {
    if (!OPTIONS["CACHE_TTL"]) { // Cache is disabled on purpose for this call
      return _request(method, url, qs, payload, OPTIONS); // Send request to Binance API
    }
    return _cache(method, url, qs, payload); // Maybe cache or Binance API
  }

  /**
  * Reads data from cache or sends a request to Binance API and stores the data into cache with given TTL.
  */
  function _cache(method, url, qs, payload) {
    const CACHE_KEY = method+"_"+url+"_"+qs;
    let data = BinCache().read(CACHE_KEY, OPTIONS["validate_cache"]);

    // Check if we have valid cached data
    if (!(data && Object.keys(data).length > 1)) { // Fetch data from API
      Logger.log("NO CACHE entry found! Loading data from API..");
      data = _request(method, url, qs, payload, OPTIONS);
      if (data && Object.keys(data).length > 1 && OPTIONS["filter"]) {
        data = OPTIONS["filter"](data); // Apply custom data filtering before storing into cache
      }
      if (data && Object.keys(data).length > 1) {
        Logger.log("DONE loading data from API! Storing at cache..");
        BinCache().write(CACHE_KEY, data, CACHE_TTL);
      } else {
        Logger.log("DONE loading data from API, but NO results to return!");
      }
    } else {
      Logger.log("FOUND CACHE entry!");
      if (OPTIONS["filter"]) { // Apply custom data filtering before return it
        data = OPTIONS["filter"](data);
      }
    }
    
    return data;
  }
  
  /**
  * Sends a request to Binance API with given parameters.
  */
  function _request(method, url, qs, payload, opts) {
    const CACHE_OK_KEY = method+"_"+url+"_"+qs;
    const need_auth = !opts["public"]; // Calling a private endpoint
    const headers = opts["headers"] || {};
    const da_payload = payload ? JSON.stringify(payload) : "";
    let options = {
      "method": method,
      "contentType": "application/json",
      "headers": headers,
      "payload": da_payload,
      "muteHttpExceptions": true,
      "validateHttpsCertificates": true
    };
    
    try {
      let da_qs = qs || "";
      if (need_auth) { // Calling a private endpoint
        if (!BinSetup().areAPIKeysConfigured()) { // Do not allow to continue if API keys aren't set!
          throw new Error("Binance API keys are required to call this operation!");
        }
        options["headers"]["X-MBX-APIKEY"] = BinSetup().getAPIKey();
        da_qs += (da_qs?"&":"")+"timestamp="+(new Date()).getTime()+"&recvWindow=30000";
        da_qs += "&signature="+_computeSignature(da_qs, da_payload);
      }
      const da_url = BASE_URL+"/"+url+"?"+da_qs;
      const response = UrlFetchApp.fetch(da_url, options);
      if (DEBUG) {
        Logger.log("QUERY: "+da_url);
        Logger.log("RESPONSE: "+response.getResponseCode());
      }
      if (response.getResponseCode() == 200) {
        BinDoLastUpdate().run(new Date()); // Refresh last update ts
        const data = JSON.parse(response.getContentText());
        if (!opts["no_cache_ok"]) { // Keep last OK response
          _setLastCacheResponseOK(CACHE_OK_KEY, da_payload, data);
        }
        return data; 
      }
      if (response.getResponseCode() == 400) {
        // There might be a problem with the Binance API keys
        throw new Error("Got 400 from Binance API! The request seems to be wrong.");
      }
      if (response.getResponseCode() == 401) {
        // There might be a problem with the Binance API keys
        throw new Error("Got 401 from Binance API! The keys aren't set or they are not valid anymore.");
      }
      if (response.getResponseCode() == 418) {
        // The IP has been auto-banned for continuing to send requests after receiving 429 codes
        Logger.log("Got 418 from Binance API! We are banned for a while..  =/");
        const options = _canRetryRequest(418, opts);
        if (options) { // Somewhat "weird" function, it acts as a bool helper and opts updater at once.. but whatever..!
          return _request(method, url, qs, payload, options);
        }
      }
      if (response.getResponseCode() == 429) {
        // Binance is telling us that we are sending too many requests
        Logger.log("Got 429 from Binance API! We are sending too many requests from our IP..  =/");
        const options = _canRetryRequest(429, opts);
        if (options) { // Somewhat "weird" function, it acts as a bool helper and opts updater at once.. but whatever..!
          return _request(method, url, qs, payload, options);
        }
      }

      const cache_response = _getLastCacheResponseOK(CACHE_OK_KEY, da_payload);
      if (cache_response) { // Fallback to last cached OK response (if any)
        Logger.log("Couldn't get an OK response from Binance API! Fallback to last cached OK response..  =0");
        return cache_response;
      }
      throw new Error("Request failed with status: "+response.getResponseCode());
    }
    catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Retries an execution for given status code.
   */
  function _canRetryRequest(code, opts) {
    const max_attempts = Math.max(opts["retries"]||0, retry_max_attempts);
    if ((opts["retries_"+code]||0) < max_attempts) {
      opts["retries_"+code] = (opts["retries_"+code]||0) + 1;
      Logger.log("Retry "+opts["retries_"+code]+"/"+max_attempts+" for status code ["+code+"] in "+retry_delay+" milliseconds..");
      Utilities.sleep(retry_delay); // Wait a little and try again!
      return opts;
    }

    return false;
  }

  /**
  * Sets last OK response into cache.
  */
  function _setLastCacheResponseOK(qs, payload, data) {
    const CACHE_TTL = 60 * 60; // 1 hour, in seconds
    Logger.log("[cache-OK] Saving OK response to cache for "+CACHE_TTL+" seconds.");
    return BinCache().write("OK_"+qs+"_"+payload, data, CACHE_TTL);
  }

  /**
  * Gets last OK response from cache.
  */
  function _getLastCacheResponseOK(qs, payload) {
    Logger.log("[cache-OK] Getting OK response from cache.");
    return BinCache().read("OK_"+qs+"_"+payload);
  }

  /**
  * Computes the HMAC signature for given query string.
  */
  function _computeSignature(qs, payload) {
    const secret = BinSetup().getAPISecret();
    return Utilities
      .computeHmacSha256Signature(qs+(payload||""), secret)
      .reduce(function(str, chr) {
        chr = (chr < 0 ? chr + 256 : chr).toString(16);
        return str + (chr.length===1?'0':'') + chr;
      },'');
  }
}