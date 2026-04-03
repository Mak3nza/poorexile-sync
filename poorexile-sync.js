// ==UserScript==
// @name         Wealthy Exile Configurable Auto-Sync
// @namespace    https://github.com/Mak3nza/poorexile-sync
// @version      0.2
// @description  Improve wealthy exile to autosync cuz poor
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

    let intervalSeconds = GM_getValue("sync_interval", 900);
    let timer;

    function findSyncButton() {
        // Find the refresh icon first, then get its parent button
        const refreshIcon = document.querySelector('svg.tabler-icon-refresh');

        if (refreshIcon) {
            // Traverse up to the button that has our target ID pattern
            return refreshIcon.closest('button[id^="mantine-"][id$="-target"]');
        }
        return null;
    }

    function startSync() {
        if (timer) clearInterval(timer);
        console.log(`Wealthy Exile: Auto-sync active (Every ${intervalSeconds}s)`);

        timer = setInterval(function() {
            const syncButton = findSyncButton();
            if (syncButton) {
                console.log(`Wealthy Exile: Clicking Refresh button...`);
                syncButton.click();
            } else {
                console.warn('Wealthy Exile: Refresh button (tabler-icon-refresh) not found.');
            }
        }, intervalSeconds * 1000);
    }

    GM_registerMenuCommand("Set Sync Interval (Seconds)", function() {
        let input = prompt("Enter sync interval in seconds:", intervalSeconds);
        let newInterval = parseInt(input);
        if (!isNaN(newInterval) && newInterval > 0) {
            GM_setValue("sync_interval", newInterval);
            location.reload();
        }
    });

    startSync();
})();
