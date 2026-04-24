package middleware

import (
	"sync"
	"time"
)

// RevocationCache is a bounded in-memory cache of recently revoked JTIs.
// It is consulted when the DB revocation check fails, so account deletions
// remain effective even during brief DB outages.
//
// Capacity: last 1000 entries. TTL: 25 hours (slightly longer than access token life).
type RevocationCache struct {
	mu      sync.RWMutex
	entries map[string]time.Time // jti → expires_at
}

const revocationCacheMax = 1000

// NewRevocationCache returns an initialised RevocationCache.
func NewRevocationCache() *RevocationCache {
	return &RevocationCache{
		entries: make(map[string]time.Time, revocationCacheMax),
	}
}

// Add records a JTI in the cache until its token expiry time.
func (c *RevocationCache) Add(jti string, expiresAt time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.entries) >= revocationCacheMax {
		// Evict one expired entry before adding; if none are expired, evict an arbitrary one.
		now := time.Now()
		for k, v := range c.entries {
			if v.Before(now) {
				delete(c.entries, k)
				break
			}
		}
		// If still at capacity, evict an arbitrary entry.
		if len(c.entries) >= revocationCacheMax {
			for k := range c.entries {
				delete(c.entries, k)
				break
			}
		}
	}
	c.entries[jti] = expiresAt
}

// Contains returns true if the JTI is in the cache and has not yet expired.
func (c *RevocationCache) Contains(jti string) bool {
	c.mu.RLock()
	exp, ok := c.entries[jti]
	c.mu.RUnlock()
	if !ok {
		return false
	}
	return time.Now().Before(exp)
}

// Cleanup removes expired entries from the cache. Call periodically.
func (c *RevocationCache) Cleanup() {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, v := range c.entries {
		if v.Before(now) {
			delete(c.entries, k)
		}
	}
}
