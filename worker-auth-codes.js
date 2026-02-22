/**
 * ML Auth Codes Worker
 * 
 * Almacena códigos de autorización de MercadoLibre.
 * 
 * SETUP:
 * 1. Crear Worker en Cloudflare: "ml-auth-codes"
 * 2. Crear KV namespace: "AUTH_CODES"
 * 3. Vincular KV al Worker con binding name: AUTH_CODES
 * 4. Deploy este código
 * 
 * Endpoints:
 *   POST /set         → { cuenta: "mikra", code: "3FEA9FDF" }
 *   GET  /get/:cuenta → { cuenta, code, updated }
 *   GET  /get-all     → { mikra: {...}, chaya: {...} }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // POST /set → guardar código
      if (request.method === 'POST' && path === '/set') {
        const { cuenta, code } = await request.json();

        if (!cuenta || !code) {
          return json({ error: 'Faltan cuenta y code' }, 400);
        }

        const data = {
          code: code.toUpperCase().trim(),
          updated: new Date().toISOString(),
          date: new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
        };

        // Guardar en KV con TTL de 24 horas
        await env.AUTH_CODES.put(`auth:${cuenta}`, JSON.stringify(data), {
          expirationTtl: 86400
        });

        return json({ ok: true, cuenta, ...data });
      }

      // GET /get/:cuenta → obtener código de una cuenta
      if (request.method === 'GET' && path.startsWith('/get/')) {
        const cuenta = path.split('/get/')[1];
        const raw = await env.AUTH_CODES.get(`auth:${cuenta}`);

        if (!raw) {
          return json({ error: 'No hay código', cuenta }, 404);
        }

        const data = JSON.parse(raw);
        return json({ cuenta, ...data });
      }

      // GET /get-all → obtener todos los códigos
      if (request.method === 'GET' && path === '/get-all') {
        const [mikra, chaya] = await Promise.all([
          env.AUTH_CODES.get('auth:mikra'),
          env.AUTH_CODES.get('auth:chaya')
        ]);

        return json({
          mikra: mikra ? JSON.parse(mikra) : null,
          chaya: chaya ? JSON.parse(chaya) : null
        });
      }

      return json({ error: 'Ruta no encontrada' }, 404);

    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}
