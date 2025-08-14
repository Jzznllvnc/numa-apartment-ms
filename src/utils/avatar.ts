import type { SupabaseClient } from '@supabase/supabase-js'

const CACHE_KEY = 'avatarSignedUrlCache'
const LAST_PATHS_KEY = 'avatarLastPaths'
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // 7 days

interface CacheEntry {
	url: string
	expiresAt: number // epoch ms
}

interface LastPathsMap {
	[userId: string]: string
}

type CacheMap = Record<string, CacheEntry>

function readCache(): CacheMap {
	if (typeof window === 'undefined') return {}
	try {
		const raw = localStorage.getItem(CACHE_KEY)
		return raw ? (JSON.parse(raw) as CacheMap) : {}
	} catch {
		return {}
	}
}

function writeCache(cache: CacheMap) {
	if (typeof window === 'undefined') return
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
	} catch {
		// ignore quota errors
	}
}

function readLastPaths(): LastPathsMap {
	if (typeof window === 'undefined') return {}
	try {
		const raw = localStorage.getItem(LAST_PATHS_KEY)
		return raw ? (JSON.parse(raw) as LastPathsMap) : {}
	} catch {
		return {}
	}
}

function writeLastPaths(map: LastPathsMap) {
	if (typeof window === 'undefined') return
	try {
		localStorage.setItem(LAST_PATHS_KEY, JSON.stringify(map))
	} catch {}
}

export function getLastAvatarPathForUser(userId: string): string {
	if (!userId) return ''
	const map = readLastPaths()
	return map[userId] || ''
}

export function setLastAvatarPathForUser(userId: string, path: string) {
	if (!userId || !path) return
	const map = readLastPaths()
	map[userId] = path
	writeLastPaths(map)
}

export function clearAvatarCache() {
	if (typeof window === 'undefined') return
	try {
		localStorage.removeItem(CACHE_KEY)
		localStorage.removeItem(LAST_PATHS_KEY)
	} catch {}
}

export function getCachedAvatarUrl(raw: string): string {
	if (!raw || raw.startsWith('http') || typeof window === 'undefined') return ''
	const cache = readCache()
	const entry = cache[raw]
	const now = Date.now()
	if (entry && entry.url && entry.expiresAt > now + 60_000) return entry.url
	return ''
}

async function fetchSignedUrl(client: SupabaseClient, path: string): Promise<string> {
	const { data } = await client.storage.from('avatars').createSignedUrl(path, EXPIRES_IN_SECONDS)
	return data?.signedUrl || ''
}

export async function getSignedAvatarUrl(
	client: SupabaseClient,
	raw: string,
	options?: { force?: boolean }
): Promise<string> {
	if (!raw) return ''
	if (raw.startsWith('http')) return raw
	if (typeof window === 'undefined') return await fetchSignedUrl(client, raw)

	const cache = readCache()
	const entry = cache[raw]
	const now = Date.now()
	// 60s safety window to avoid using nearly-expired URLs
	if (!options?.force && entry && entry.url && entry.expiresAt > now + 60_000) {
		return entry.url
	}

	const url = await fetchSignedUrl(client, raw)
	cache[raw] = { url, expiresAt: now + EXPIRES_IN_SECONDS * 1000 }
	writeCache(cache)
	return url
}

export function invalidateSignedAvatarUrlsForPrefix(prefix: string) {
	if (typeof window === 'undefined') return
	const cache = readCache()
	let changed = false
	for (const key of Object.keys(cache)) {
		if (key.startsWith(prefix)) {
			delete cache[key]
			changed = true
		}
	}
	if (changed) writeCache(cache)
} 