// ==UserScript==
// @name         ML Auth Code Sync
// @namespace    https://rafaelassir.workers.dev/
// @version      1.0
// @description  Extrae código de autorización de ML y lo sube a Cloudflare
// @author       Rafael
// @match        https://www.mercadolibre.com.ar/ventas/*
// @grant        GM_xmlhttpRequest
// @connect      ml-auth-codes.rafaelassir.workers.dev
// ==/UserScript==

(function() {
    'use strict';

    const WORKER_URL = 'https://ml-auth-codes.rafaelassir.workers.dev';

    // Mapeo de usuario ML → cuenta
    const CUENTAS = {
        'rafael': 'mikra',
        'CHAYA': 'chaya'
    };

    // Esperar a que cargue el código
    function intentarExtraer() {
        const codeEl = document.querySelector('#banner-auth__code--content strong');
        const usernameEl = document.querySelector('.nav-header-username');

        if (!codeEl || !usernameEl) return false;

        const code = codeEl.textContent.trim();
        const username = usernameEl.textContent.trim();
        const cuenta = CUENTAS[username];

        if (!code || !cuenta) {
            console.log(`[Auth Sync] No reconocido: user="${username}" code="${code}"`);
            return false;
        }

        console.log(`[Auth Sync] ${cuenta.toUpperCase()}: ${code}`);

        // Enviar al worker
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${WORKER_URL}/set`,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ cuenta, code }),
            onload: function(res) {
                console.log(`[Auth Sync] ✅ ${cuenta}: ${code} subido OK`);
                mostrarBadge(cuenta, code, true);
            },
            onerror: function(err) {
                console.error(`[Auth Sync] ❌ Error subiendo:`, err);
                mostrarBadge(cuenta, code, false);
            }
        });

        return true;
    }

    function mostrarBadge(cuenta, code, ok) {
        // Evitar duplicados
        const existente = document.getElementById('auth-sync-badge');
        if (existente) existente.remove();

        const badge = document.createElement('div');
        badge.id = 'auth-sync-badge';
        badge.style.cssText = `
            position: fixed; bottom: 16px; left: 16px; z-index: 99999;
            background: ${ok ? '#00a650' : '#ff4444'}; color: white;
            padding: 8px 14px; border-radius: 10px;
            font-family: monospace; font-size: 13px; font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: opacity 0.5s;
        `;
        badge.textContent = ok
            ? `✅ ${cuenta.toUpperCase()}: ${code} sincronizado`
            : `❌ Error sincronizando ${cuenta.toUpperCase()}`;
        document.body.appendChild(badge);

        // Desaparecer después de 5 segundos
        setTimeout(() => {
            badge.style.opacity = '0';
            setTimeout(() => badge.remove(), 500);
        }, 5000);
    }

    // Intentar varias veces (la página es SPA, tarda en renderizar)
    let intentos = 0;
    const interval = setInterval(() => {
        if (intentarExtraer() || intentos++ > 30) {
            clearInterval(interval);
        }
    }, 1000);
})();
