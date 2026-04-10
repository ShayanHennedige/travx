/**
 * Redis is disabled per user request. 
 * All functions are no-ops to avoid breaking existing imports.
 */

export const getCache = async (key: string) => {
    return null;
};

export const setCache = async (key: string, value: any, ttlSeconds = 3600) => {
    return;
};

export const delCache = async (key: string) => {
    return;
};

export const delCachePattern = async (pattern: string) => {
    return;
};

const redis = null;
export default redis;
