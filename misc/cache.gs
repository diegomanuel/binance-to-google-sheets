/**
 * Cache wrapper.
 */
function BinCache() {
  return {
    read,
    write
  };
  

  /**
  * Reads data from cache optionally applying a custom cache validation function.
  */
  function read(key, validate) {
    const CACHE_KEY = _craftKey(key);
    const cache = CacheService.getUserCache();
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
    const cache = CacheService.getUserCache();
    const blob_data = Utilities.zip([Utilities.newBlob(JSON.stringify(data), "application/octet-stream")]);
    cache.put(CACHE_KEY, Utilities.base64Encode(blob_data.getBytes()), ttl);
    return cache;
  }

  function _craftKey(key) {
    return "BIN_CACHE{"+key+"}";
  }
}