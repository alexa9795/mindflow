package middleware

import (
	"sync"
	"time"
)

// RevocationCache is a bounded in-memory cache of recently revoked JTIs.
// It is consulted when the DB revocation check fails, so account deletions
// remain effective even during brief DB outages.
//
// Capacity: last 1000 entries. Eviction: oldest-first (insertion order).
// TTL: access tokens are 15 minutes, so entries expire well before eviction.
type RevocationCache struct {
	mu      sync.RWMutex
	entries map[string]time.Time // jti → expires_at
	order   []string             // insertion-ordered keys for oldest-first eviction
}

const revocationCacheMax = 1000

// NewRevocationCache returns an initialised RevocationCache.
func NewRevocationCache() *RevocationCache {
	return &RevocationCache{
		entries: make(map[string]time.Time, revocationCacheMax),
		order:   make([]string, 0, revocationCacheMax),
	}
}

// Add records a JTI in the cache until its token expiry time.
// When at capacity, the oldest entry is evicted to make room.
func (c *RevocationCache) Add(jti string, expiresAt time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.entries[jti]; exists {
		return // already present
	}
	if len(c.entries) >= revocationCacheMax {
		// Evict the oldest entry (front of the insertion-order slice).
		oldest := c.order[0]
		c.order = c.order[1:]
		delete(c.entries, oldest)
	}
	c.entries[jti] = expiresAt
	c.order = append(c.order, jti)
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
	kept := c.order[:0]
	for _, jti := range c.order {
		if exp, ok := c.entries[jti]; ok && exp.After(now) {
			kept = append(kept, jti)
		} else {
			delete(c.entries, jti)
		}
	}
	c.order = kept
}
