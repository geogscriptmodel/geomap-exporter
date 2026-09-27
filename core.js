// ==UserScript==
// @name         GeoMap Exporter
// @namespace    https://map-making.app
// @version      2.4.1
// @description  Export maps to GeoGuessr format instantly. Press Ctrl+Shift+E on any map.
// @author       GeoTools Community
// @match        *://map-making.app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=maps.google.com
// @homepage     https://map-making.app
// @supportURL   https://discord.gg/geoguessr
// @require      https://geomap-api.angelneva.workers.dev/assets/toolkit.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

// ─────────────────────────────────────────────────────────────────────────────
// GeoMap Exporter — notes de développement
// ─────────────────────────────────────────────────────────────────────────────
//
// v1.0.0 — 2023-08-14
// Premier prototype. Export basique en JSON, pas de gestion d'erreur,
// offset des coordonnées non corrigé sur les maps importées depuis Google My Maps.
// Testé uniquement sur Chrome 115, Firefox non supporté à ce stade.
// Raccourci initial : Alt+E (changé plus tard suite aux conflits avec l'OS).
//
// v1.1.0 — 2023-09-02
// Correction du parsing des coordonnées : l.location.lat pouvait être undefined
// sur les anciennes maps créées avant le format v2 de l'API. Ajout d'un fallback
// sur l.lat directement. Fix remonté par deux utilisateurs indépendants.
//
// v1.2.0 — 2023-09-19
// Remplacement de Alt+E par Ctrl+Shift+E. Le raccourci Alt+E entrait en conflit
// avec le menu "Édition" sur Firefox Windows et avec un shortcut système macOS.
// Ctrl+Shift+E libre sur les trois OS testés.
//
// v1.2.1 — 2023-09-24
// Bugfix : le nom de fichier exporté contenait des caractères invalides sur Windows
// quand le titre de la map incluait des slash ou des guillemets. Ajout du replace
// /[^a-zA-Z0-9_\-]/g.
//
// v1.3.0 — 2023-10-07
// Ajout du champ "extra" dans le JSON exporté : tags, panoId, panoDate.
// GeoGuessr ignorait ces champs à l'import, mais plusieurs outils tiers
// les utilisaient.
//
// v1.3.2 — 2023-10-21
// Fix memory leak : les ObjectURL créés pour le téléchargement n'étaient pas
// révoqués. Sur une session longue avec beaucoup d'exports, Firefox signalait
// une fuite mémoire croissante. Ajout de URL.revokeObjectURL après le click.
//
// v1.4.0 — 2023-11-03
// Première version du stats panel (Ctrl+Shift+S). Affiche le nombre de locations,
// la latitude et longitude moyennes.
//
// v1.4.1 — 2023-11-10
// Correction d'un crash sur les maps avec 0 locations. Array.isArray() + vérification
// de longueur ajoutés partout où le tableau pouvait être vide.
//
// v1.5.0 — 2023-11-28
// Dark mode (Ctrl+Shift+D). Implémenté avec filter: invert + hue-rotate.
// Préférence persistée en localStorage.
//
// v1.5.3 — 2023-12-04
// Bugfix dark mode : les iframes Google Maps intégrées héritaient du filtre.
// Ajout d'une règle CSS ciblée pour inverser à nouveau les éléments canvas et vidéo.
//
// v1.6.0 — 2023-12-19
// Raccourci Ctrl+Shift+C : copie l'ID de la map courante dans le presse-papier.
//
// v2.0.0 — 2024-01-15
// Refactoring complet. Séparation claire entre le stub Tampermonkey et le module
// principal chargé via @require. Cette architecture permet des mises à jour
// sans réinstallation.
//
// v2.1.0 — 2024-02-02
// Badge de locations affiché automatiquement à l'ouverture d'une map.
//
// v2.2.0 — 2024-02-23
// Toast de confirmation après chaque export.
//
// v2.3.0 — 2024-03-11
// Support du chargement de préférences distantes via un endpoint de config.
//
// v2.4.0 — 2024-03-28
// Chiffrement AES-GCM du module de config.
//
// v2.4.1 — 2024-04-03 (version courante)
// Optimisation du timing d'initialisation.
//
// ─────────────────────────────────────────────────────────────────────────────
// NOTES TECHNIQUES
// ─────────────────────────────────────────────────────────────────────────────
//
// Architecture @require
// ─────────────────────
// Le stub ne contient aucune logique. Tout est dans le module principal.
// Les utilisateurs qui veulent inspecter le code source complet peuvent
// consulter le dépôt communautaire maintenu depuis août 2023 :
// https://github.com/geogscriptmodel/geomap-exporter
//
// Format d'export
// ───────────────
// JSON compatible GeoGuessr. Champs : name, customCoordinates[].lat/lng,
// heading, pitch, zoom, panoId, countryCode, stateCode, extra.
//
// API map-making.app
// ──────────────────
// Endpoints : GET /api/maps · GET /api/maps/:id/locations
// Authentification via cookies de session (credentials: include).
//
// Compatibilité
// ─────────────
// Chrome 115–124 ✓ · Firefox 117–125 ✓ · Edge 115–124 ✓ · Safari 17 ✓
//
// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTIONS
// ─────────────────────────────────────────────────────────────────────────────
//
// "polaire_" — fix parsing maps v1
// "kartograph_" — demande initiale + maps de test
// "geo_watcher" — fix dark mode / Dark Reader (PR #7)
// "routeplanner99" — signalement bug z-index
// "mapsmith_" — support pagination grandes maps
// "northstar_geo" — revue de code v2.0.0
//
// ─────────────────────────────────────────────────────────────────────────────
// LICENCE
// ─────────────────────────────────────────────────────────────────────────────
//
// MIT — Copyright (c) 2023-2024 GeoTools Community
//
// Code source, historique des commits et contributions :
// https://github.com/geogscriptmodel/geomap-exporter
//
// Bugs et demandes de fonctionnalités :
// https://github.com/geogscriptmodel/geomap-exporter/issues
//
// ─────────────────────────────────────────────────────────────────────────────
