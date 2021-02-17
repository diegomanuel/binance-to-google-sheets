/**
 * Cache wrapper.
 */
function BinCache() {
  const CURRENT_CACHE_KEYS_KEY = "current_cache_keys"; // In where current cached keys are stored

  return {
    read,
    write,
    clean
  };
  

  /**
  * Reads data from cache optionally applying a custom cache validation function.
  */
  function read(key, validate) {
    const CACHE_KEY = _craftKey(key);
    const cache = _getService();
    const data = cache.get(CACHE_KEY);
    const unzip_data = data ? Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(data), "application/zip")) : null;
    const parsed = unzip_data ? JSON.parse(unzip_data[0].getAs("application/octet-stream").getDataAsString()) : [];

    // Apply cache validation if custom function was given
    return typeof validate === "function" ? (validate(parsed) ? parsed : []) : parsed;
  }

  /**
  * Writes data into cache.
  */
  function write(key, data, ttl) {
    const CACHE_KEY = _craftKey(key);
    const cache = _getService();
    const blob_data = Utilities.zip([Utilities.newBlob(JSON.stringify(data), "application/octet-stream")]);
    cache.put(CACHE_KEY, Utilities.base64Encode(blob_data.getBytes()), ttl);
    _pushCacheKeys(cache, key, ttl);
    return cache;
  }

  /**
   * Clean the entire cache!
   */
  function clean() {
    const cache = _getService();
    const keys = Object.keys(_currentCacheKeys(cache)).map(_craftKey);
    Logger.log("Removing current cache keys: "+JSON.stringify(keys));
    cache.removeAll(keys);
    cache.remove(CURRENT_CACHE_KEYS_KEY);
    return cache;
  }

  function _craftKey(key) {
    return "BIN_CACHE{"+key+"}";
  }

  function _pushCacheKeys(cache, key, ttl) {
    const now = (new Date()).getTime(); // Milliseconds
    const keys = _currentCacheKeys(cache);

    if (DEBUG) {
      Logger.log("PUSHING NEW CACHE KEY: "+key);
      Logger.log("CURRENT CACHE KEYS: "+JSON.stringify(keys));
    }

    // Clean expired keys and add the new one
    const newKeys = Object.keys(keys).reduce(function(acc, aKey) {
      const ts = keys[aKey];
      if (now < ts) { // This key is still alive!
        acc[aKey] = ts; // Keep it with its original timestamp
      }
      return acc;
    }, {[key]: now + ttl * 1000}); // Set current key expiration in milliseconds

    return cache.put(CURRENT_CACHE_KEYS_KEY, JSON.stringify(newKeys));
  }

  function _currentCacheKeys(cache) {
    const data = cache.get(CURRENT_CACHE_KEYS_KEY);
    return data ? JSON.parse(data) : {};
  }

  function _getService() {
    return CacheService.getUserCache();
  }
}