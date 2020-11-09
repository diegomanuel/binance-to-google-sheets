/**
 * API client wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinRequest() {
  return {
    cache,
    send
  };
  

  /**
  * Reads data from cache or sends a request to the backend API and stores the data into cache with given TTL.
  */
  function cache(CACHE_TTL, method, url, qs, payload, opts) {
    opts = opts || {}; // Init opts
    let data = BinCache().read(method+"_"+url+"_"+qs);
    
    // First check if we have a cached version
    if (!(data && data.length > 1)) { // Fetch data from API
      Logger.log("NO CACHE entry found! Loading data from API..");
      data = send(method, url, qs, payload, opts);
      if (data && data.length > 1) {
        Logger.log("DONE loading data from API! Storing at cache..");
        if (opts["filter"]) { // Apply custom data filtering before storing into cache
          data = opts["filter"](data);
        }
        BinCache().write(method+"_"+url+"_"+qs, data, CACHE_TTL);
      }
    } else {
      Logger.log("FOUND CACHE entry!");
    }
    
    return data;
  }
  
  /**
  * Sends a request to the backend API with given parameters.
  */
  function send(method, url, qs, payload, opts) {
    opts = opts || {}; // Init opts
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
        Logger.log("RESPONSE: "+JSON.stringify(response));
      }
      if (response.getResponseCode() == 200) {
        BinDoLastUpdate().run(new Date()); // Refresh last update ts
        const resptext = response.getContentText();
        _setLastCacheResponseOK(da_qs, da_payload, resptext); // Keep last OK response
        return JSON.parse(resptext); 
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
          return send(method, url, qs, payload, options);
        }
      }
      if (response.getResponseCode() == 429) {
        // Binance is telling us that we are sending too many requests
        Logger.log("Got 429 from Binance API! We are sending too many requests from our IP..  =/");
        const options = _canRetryRequest(429, opts);
        if (options) { // Somewhat "weird" function, it acts as a bool helper and opts updater at once.. but whatever..!
          return send(method, url, qs, payload, options);
        }
      }

      const cache_response = _getLastCacheResponseOK(da_qs, da_payload);
      if (cache_response) { // Fallback to last cached OK response (if any)
        Logger.log("Got 429 from Binance API! Retry "+opts["retries_429"]+"/3 in five seconds..");
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
    if (opts["retries_"+code]||0 < 3) {
      opts["retries_"+code] = (opts["retries_"+code]||0) + 1;
      Logger.log("Retry "+opts["retries_"+code]+"/3 for status code ["+code+"] in five seconds..");
      Utilities.sleep(5000); // Wait a little and try again!
      return opts;
    }

    return false;
  }

  /**
  * Sets last OK response into cache.
  */
  function _setLastCacheResponseOK(qs, payload, data) {
    const CACHE_TTL = 60 * 60; // 1 hour, in seconds
    return BinCache().write("OK_"+qs+"_"+payload, data, CACHE_TTL);
  }

  /**
  * Gets last OK response from cache.
  */
  function _getLastCacheResponseOK(qs, payload) {
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
        return str + (chr.length==1?'0':'') + chr;
      },'');
  }
}