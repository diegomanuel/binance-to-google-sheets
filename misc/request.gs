/**
 * API client wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinRequest() {
  return {
    cache,
    send,
    lastUpdate
  };
  

  /**
  * Reads data from cache or sends a request to the backend API and stores the data into cache with given TTL.
  */
  function cache(CACHE_TTL, method, url, qs, payload, opts) {
    opts = opts || {}; // Init opts
    const CACHE_KEY = "BIN_CACHE{"+method+"_"+url+"_"+qs+"}";
    const cache = CacheService.getUserCache();
    const cache_data = cache.get(CACHE_KEY);
    const unzip_data = cache_data ? Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(cache_data), "application/zip")) : null;
    let data = unzip_data ? JSON.parse(unzip_data[0].getAs("application/octet-stream").getDataAsString()) : [];
    
    // First check if we have a cached version
    if (!(data && data.length > 1)) { // Fetch data from API
      Logger.log("NO CACHE entry found! Loading data from API..");
      data = send(method, url, qs, payload, opts);
      if (data && data.length > 1) {
        Logger.log("DONE loading data from API! Storing at cache..");
        if (opts["filter"]) { // Apply custom data filtering before storing into cache
          data = opts["filter"](data);
        }
        const blob_data = Utilities.zip([Utilities.newBlob(JSON.stringify(data), "application/octet-stream")]);
        cache.put(CACHE_KEY, Utilities.base64Encode(blob_data.getBytes()), CACHE_TTL);
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
        options["headers"]["X-MBX-APIKEY"] = BinSetup().getAPIKey();
        da_qs += (da_qs?"&":"")+"timestamp="+(new Date()).getTime()+"&recvWindow=30000";
        da_qs += "&signature="+getSignature(da_qs, da_payload);
      }
      const da_url = BASE_URL+"/"+url+"?"+da_qs;
      const response = UrlFetchApp.fetch(da_url, options);
      if (response.getResponseCode() == 200) {
        lastUpdate(new Date()); // Refresh last update ts
        return JSON.parse(response.getContentText()); 
      }
      if (response.getResponseCode() == 418) {
        // The IP has been auto-banned for continuing to send requests after receiving 429 codes
        Logger.log("Got 418 from Binance API! We are banned for a while..  =/");
        return null; 
      }
      if (response.getResponseCode() == 429 && opts["retries"] < 3) {
        opts["retries"] = (opts["retries"]||0) + 1;
        Logger.log("Got 429 from Binance API! Retry "+opts["retries"]+"/3 in five seconds..");
        Utilities.sleep(5000); // Wait a little and try again!
        return send(method, url, qs, payload, opts); 
      }
      console.error(response);
      throw new Error("Request failed with status: "+response.getResponseCode());
    }
    catch (err) {
      console.error(err);
      throw err;
    }
  }
  
  /**
  * Sets or returns the timestamp of the last issued request to the backend API.
  */
  function lastUpdate(ts) {
    const doc_props = PropertiesService.getDocumentProperties();
    
    if (ts == undefined) { // Getter
      const last_update = doc_props.getProperty("BIN_LAST_UPDATE");
      ts = last_update ? new Date(last_update) : "-";
      Logger.log("[BinLastUpdate/1] Got last update time: "+ts);
      return ts;
    }
    
    // Setter
    ts = new Date();
    doc_props.setProperty("BIN_LAST_UPDATE", ts);
    Logger.log("[BinLastUpdate/1] Set last update time: "+ts);
    return ts;
  }

  /**
  * @OnlyCurrentDoc
  */
  function getSignature(qs, payload) {
    const secret = BinSetup().getAPISecret();
    return Utilities
      .computeHmacSha256Signature(qs+(payload||""), secret)
      .reduce(function(str, chr) {
        chr = (chr < 0 ? chr + 256 : chr).toString(16);
        return str + (chr.length==1?'0':'') + chr;
      },'');
  }
}