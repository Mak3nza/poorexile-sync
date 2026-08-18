// ==UserScript==
// @name         Wealthy Exile Configurable Auto-Sync
// @namespace    https://github.com/Mak3nza/poorexile-sync
// @version      0.4
// @description  Improve wealthy exile to autosync cuz poor (robust button detection + pointer events)
// @author       Makenza
// @match        https://wealthyexile.com/stash*
// @updateURL    https://github.com/Mak3nza/poorexile-sync/raw/main/poorexile-sync.js
// @downloadURL  https://github.com/Mak3nza/poorexile-sync/raw/main/poorexile-sync.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // Prevent double-injection
    if (window.__poorexileSyncLoaded) {
        console.info('poorexile-sync: already loaded, aborting duplicate injection.');
        return;
    }
    window.__poorexileSyncLoaded = true;

    let intervalSeconds = GM_getValue("sync_interval", 900);
    let selectorOverride = GM_getValue("sync_selector_override", "");
    let timer;

    function isVisibleAndEnabled(elem) {
        if (!elem) return false;
        if (elem.disabled) return false;
        // visible check: bounding rect and not display:none/visibility:hidden
        const rects = elem.getClientRects();
        if (!rects || rects.length === 0) return false;
        const style = window.getComputedStyle(elem);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
    }

    function getAccessibleName(elem) {
        // Best-effort accessible name: aria-label > title > textContent
        if (!elem) return "";
        const aria = elem.getAttribute && elem.getAttribute('aria-label');
        if (aria) return aria.trim();
        const title = elem.getAttribute && elem.getAttribute('title');
        if (title) return title.trim();
        const txt = (elem.innerText || elem.textContent || "").trim();
        return txt;
    }

    function dispatchPointerAndMouseSequence(target) {
        if (!target) return;
        try {
            // pointerdown -> mousedown -> pointerup -> mouseup -> click
            const pointerDown = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerType: 'mouse'});
            const mouseDown = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
            const pointerUp = new PointerEvent('pointerup', {bubbles: true, cancelable: true, pointerType: 'mouse'});
            const mouseUp = new MouseEvent('mouseup', {bubbles: true, cancelable: true});

            target.dispatchEvent(pointerDown);
            target.dispatchEvent(mouseDown);
            // short gap not necessary, but library code may expect sequencing
            target.dispatchEvent(pointerUp);
            target.dispatchEvent(mouseUp);

            // final click to trigger default handlers
            target.click();
        } catch (e) {
            // Fallback to simple click if event construction fails in some environments
            console.warn('poorexile-sync: dispatch sequence failed, falling back to .click()', e);
            try { target.click(); } catch (inner) { console.error('poorexile-sync: click() also failed', inner); }
        }
    }

    function findSyncButton() {
        // 1) user override selector (explicit)
        if (selectorOverride) {
            try {
                const el = document.querySelector(selectorOverride);
                if (el && isVisibleAndEnabled(el)) {
                    console.debug('poorexile-sync: found button via user override selector');
                    return el;
                }
            } catch (e) {
                console.warn('poorexile-sync: invalid selector override:', selectorOverride, e);
            }
        }

        // 2) exact aria-label "Sync stash" (case-insensitive)
        let el = document.querySelector('button[aria-label="Sync stash" i]');
        if (el && isVisibleAndEnabled(el)) {
            console.debug('poorexile-sync: found button by exact aria-label "Sync stash"');
            return el;
        }

        // 3) aria-label contains "sync" or "snapshot"
        el = document.querySelector('button[aria-label*="sync" i], button[aria-label*="snapshot" i]');
        if (el && isVisibleAndEnabled(el)) {
            console.debug('poorexile-sync: found button by aria-label contains "sync|snapshot"');
            return el;
        }

        // 4) any visible button whose accessible name matches /\b(sync|snapshot)\b/i
        const candidateButtons = Array.from(document.querySelectorAll('button'));
        const NAME_RE = /\b(sync|snapshot)\b/i;
        for (const b of candidateButtons) {
            if (!isVisibleAndEnabled(b)) continue;
            const name = getAccessibleName(b);
            if (NAME_RE.test(name)) {
                console.debug('poorexile-sync: found button by accessible name match:', name);
                return b;
            }
        }

        // 5) final fallback: svg.tabler-icon-refresh -> closest button
        const refreshIcon = document.querySelector('svg.tabler-icon-refresh');
        if (refreshIcon) {
            const parentButton = refreshIcon.closest('button');
            if (parentButton && isVisibleAndEnabled(parentButton)) {
                console.debug('poorexile-sync: found button via svg.tabler-icon-refresh fallback');
                return parentButton;
            }
        }

        return null;
    }

    function startSync() {
        if (timer) clearInterval(timer);
        console.log(`poorexile-sync: Auto-sync active (Every ${intervalSeconds}s)`);

        timer = setInterval(function() {
            const syncButton = findSyncButton();
            if (syncButton) {
                console.log(`poorexile-sync: Clicking Refresh button...`);
                dispatchPointerAndMouseSequence(syncButton);
            } else {
                console.warn('poorexile-sync: Refresh button not found.');
            }
        }, Math.max(1, intervalSeconds) * 1000);
    }

    GM_registerMenuCommand("Set Sync Interval (Seconds)", function() {
        let input = prompt("Enter sync interval in seconds:", intervalSeconds);
        let newInterval = parseInt(input);
        if (!isNaN(newInterval) && newInterval > 0) {
            GM_setValue("sync_interval", newInterval);
            location.reload();
        }
    });

    GM_registerMenuCommand("Set/clear selector override for sync button", function() {
        let input = prompt("Enter a CSS selector that matches the sync button (empty to clear):", selectorOverride || "");
        if (input === null) return; // cancelled
        input = (input || "").trim();
        if (input === "") {
            GM_setValue("sync_selector_override", "");
            alert("Selector override cleared. Reloading.");
            location.reload();
            return;
        }
        // test selector
        try {
            const el = document.querySelector(input);
            if (!el) {
                if (!confirm("No element matches that selector currently. Save it anyway?")) return;
            }
            GM_setValue("sync_selector_override", input);
            alert("Selector saved. Reloading.");
            location.reload();
        } catch (e) {
            alert("Invalid selector syntax: " + e.message);
        }
    });

    // Kick off
    startSync();

})();
