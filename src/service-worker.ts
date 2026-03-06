/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const CACHE_NAME = `biglot-pwa-${version}`;
const APP_ROUTES = ['/', '/kanban', '/calendar'];
const APP_ASSETS = [...build, ...files, '/manifest.webmanifest', '/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];
const PRECACHE_URLS = Array.from(new Set([...APP_ASSETS, ...APP_ROUTES]));

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(PRECACHE_URLS);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((cacheName) => cacheName !== CACHE_NAME)
					.map((cacheName) => caches.delete(cacheName))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(request);
					const cache = await caches.open(CACHE_NAME);
					cache.put(request, response.clone());
					return response;
				} catch {
					return (
						(await caches.match(request)) ??
						(await caches.match(url.pathname)) ??
						(await caches.match('/'))
					);
				}
			})()
		);
		return;
	}

	if (PRECACHE_URLS.includes(url.pathname)) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(request);
				if (cached) return cached;

				const response = await fetch(request);
				if (response.ok) {
					const cache = await caches.open(CACHE_NAME);
					cache.put(request, response.clone());
				}
				return response;
			})()
		);
	}
});
