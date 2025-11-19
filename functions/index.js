const functions = require('firebase-functions')
// Keep v1 API only to ensure Node.js 18 (Gen1) deployment per project requirement
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(m => m.default(...args)))
const admin = require('firebase-admin')
if (!admin.apps.length) {
  admin.initializeApp()
}
const dbAdmin = admin.database()

// Support config via functions.config() or environment variables
const cfg = functions.config()
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || (cfg.azure && cfg.azure.tenant_id)
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || (cfg.azure && cfg.azure.client_id)
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || (cfg.azure && cfg.azure.client_secret)
const MS_GRAPH_FROM_USER = process.env.MS_GRAPH_FROM_USER || (cfg.ms && cfg.ms.from_user)
const FUNCTIONS_SECRET = process.env.FUNCTIONS_SECRET || (cfg.security && cfg.security.functions_secret)
const BUSINESS_START_HOUR = 8
const BUSINESS_END_HOUR = 17
const REMINDER_THRESHOLD_HOURS = 10
const COSTA_RICA_OFFSET_MS = -6 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const ROOT_EMAIL_POOL = 'emailPools'
const REVISION_POOL_KEY = 'revision_areas'
const DEFAULT_REVISION_POOL = [
  'planeacion.eventos@costaricacc.com',
  'luis.arvizu@costaricacc.com',
  'yoxsy.chaves@costaricacc.com',
  'seguridad@costaricacc.com',
  'infra@costaricacc.com',
  'silvia.navarro@costaricacc.com',
  'centralseguridad@costaricacc.com'
]

function buildRecipients(list) {
  if (!list) return []
  if (typeof list === 'string') list = list.split(',').map(s => s.trim()).filter(Boolean)
  return list.map(addr => ({ emailAddress: { address: addr } }))
}

const localDateFormatter = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Costa_Rica'
})

function normalizePoolValue(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean)
  return []
}

async function getRevisionPoolRecipients() {
  try {
    const snap = await dbAdmin.ref(`${ROOT_EMAIL_POOL}/${REVISION_POOL_KEY}`).get()
    if (snap.exists()) {
      const val = snap.val()
      const resolved = normalizePoolValue(val)
      if (resolved.length) return resolved
    }
  } catch (err) {
    console.error('Error reading revision email pool:', err)
  }
  return [...DEFAULT_REVISION_POOL]
}

function formatCostaRicaDate(isoString) {
  if (!isoString) return 'Sin fecha'
  try {
    return localDateFormatter.format(new Date(isoString))
  } catch (err) {
    return isoString
  }
}

function countBusinessHoursBetween(startIso, nowUtcMs = Date.now()) {
  if (!startIso) return 0
  const startUtcMs = new Date(startIso).getTime()
  if (Number.isNaN(startUtcMs)) return 0
  const startLocalMs = startUtcMs + COSTA_RICA_OFFSET_MS
  const currentLocalMs = nowUtcMs + COSTA_RICA_OFFSET_MS
  if (currentLocalMs <= startLocalMs) return 0

  let cursor = startLocalMs
  let hours = 0

  while (cursor < currentLocalMs) {
    const snapshotDay = new Date(cursor)
    const dayStartLocalMs = Date.UTC(
      snapshotDay.getUTCFullYear(),
      snapshotDay.getUTCMonth(),
      snapshotDay.getUTCDate(),
      0, 0, 0, 0
    )
    const dayOfWeek = new Date(dayStartLocalMs).getUTCDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const businessStart = dayStartLocalMs + BUSINESS_START_HOUR * 3600000
      const businessEnd = dayStartLocalMs + BUSINESS_END_HOUR * 3600000
      const from = Math.max(cursor, businessStart)
      const to = Math.min(currentLocalMs, businessEnd)
      if (to > from) {
        hours += (to - from) / 3600000
      }
    }
    cursor = dayStartLocalMs + DAY_MS
  }

  return hours
}

async function sendDamageReportReminderEmail(entries, recipients) {
  if (!entries.length) return
  const sender = MS_GRAPH_FROM_USER
  if (!sender) throw new Error('Sender not configured (MS_GRAPH_FROM_USER)')

  const subject = entries.length === 1
    ? `Recordatorio | Envío de reporte de daños pendiente — ${entries[0].nombreEvento || 'Evento'}`
    : `Recordatorio | ${entries.length} eventos sin reporte de daños`

  const intro = `Han transcurrido más de ${REMINDER_THRESHOLD_HOURS} horas hábiles (8:00-17:00) desde que se guardó el acta, pero aún no se ha enviado el reporte de daños correspondiente.`
  const items = entries.map(entry => ({
    title: entry.nombreEvento || 'Evento sin nombre',
    subtitle: `Recinto: ${entry.recinto || 'N/D'} · Creado: ${formatCostaRicaDate(entry.fechaCreacion)} · Horas hábiles: ${entry.businessHours.toFixed(1)}`
  }))

  const htmlContent = buildEmailHtml({
    subject,
    template: {
      title: 'Recordatorio: Reporte de Daños pendiente',
      intro,
      items,
      footer_text: 'Este recordatorio se genera automáticamente dentro del horario laboral (8:00-17:00) y sólo se envía una vez por acta.'
    }
  })

  const accessToken = await getAccessToken()
  const message = {
    message: {
      subject,
      body: { contentType: 'HTML', content: htmlContent },
      toRecipients: buildRecipients(recipients)
    },
    saveToSentItems: true
  }

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`
  const res = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })

  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Recordatorio: Graph API error ${res.status} ${details}`)
  }
}

// Build a polished HTML email using inline styles that mirror the app's design system
function inline(s) {
  // simple helper to collapse spaces
  return (s || '').replace(/\s+/g, ' ').trim()
}

function buildEmailHtml({ body, template, subject }) {
  // template: { logo_url, title, intro, items: [{title, subtitle, image}], cta_text, cta_url, footer_text }
  const tpl = template || {}
  const logo = tpl.logo_url || ''
  const title = tpl.title || subject || ''
  const intro = tpl.intro || ''
  const items = Array.isArray(tpl.items) ? tpl.items : []
  const ctaText = tpl.cta_text || tpl.cta || ''
  const ctaUrl = tpl.cta_url || tpl.cta || ''
  const footer = tpl.footer_text || ''

  // Colors derived from app's CSS variables
  const colorPrimary = '#2d2d2d'
  const colorBackground = '#fafafa'
  const colorSurface = '#ffffff'
  const colorAccent = '#000000'
  const colorTextPrimary = '#2d2d2d'
  const colorTextSecondary = '#6b6b6b'
  const borderRadius = '10px'

  // Build items HTML
  const itemsHtml = items.map(it => {
    const img = it.image ? `<td style="width:72px;padding-right:12px;vertical-align:top"><img src="${escapeHtml(it.image)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px;display:block"/></td>` : ''
    const titlePart = it.title ? `<div style="font-weight:600;color:${colorTextPrimary};margin-bottom:4px">${escapeHtml(it.title)}</div>` : ''
    const subtitlePart = it.subtitle ? `<div style="color:${colorTextSecondary};font-size:13px;line-height:1.3">${escapeHtml(it.subtitle)}</div>` : ''
    return `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:14px 0"> <table role="presentation" style="width:100%"><tr>${img}<td style="vertical-align:top">${titlePart}${subtitlePart}</td></tr></table></td></tr>`
  }).join('')

  // CTA button HTML (inline styles)
  const ctaHtml = ctaText && ctaUrl ? `<table role="presentation" align="center" style="margin:16px auto 8px"><tr><td align="center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${colorAccent};color:${colorBackground};text-decoration:none;font-weight:600">${escapeHtml(ctaText)}</a></td></tr></table>` : ''

  // If caller provided raw body HTML and no template, preserve it
  if (!template && body) return body

  // If a full acta structure is provided, render it to match the app UI
  if (template && template.acta) {
    const acta = template.acta
    const logoUrl = acta.logo_url || ''
    const titleText = acta.title || 'Acta de Entrega de Áreas'
    const g = acta.general || {}
    const salones = Array.isArray(acta.salones) ? acta.salones : []

    const generalRows = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Recinto</div>
          <div style="color:${colorTextSecondary}">${escapeHtml(g.recinto || '')}</div>
        </div>
        <div style="flex:1;min-width:220px">
          <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Nombre del Evento</div>
          <div style="color:${colorTextSecondary}">${escapeHtml(g.nombreEvento || '')}</div>
        </div>
        <div style="flex:1;min-width:160px">
          <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Fecha</div>
          <div style="color:${colorTextSecondary}">${escapeHtml(g.fechaEvento || '')}</div>
        </div>
        <div style="flex:1;min-width:160px">
          <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Tipo</div>
          <div style="color:${colorTextSecondary}">${escapeHtml(g.tipo_entrega || '')}</div>
        </div>
      </div>
    `

      const salonesHtml = salones.map(salon => {
      const novedades = Array.isArray(salon.novedades) ? salon.novedades : []
      if (novedades.length === 0) return ''
      const itemsHtml = novedades.map(n => {
        const imgHtml = n.imagenUrl ? `<div style="margin-top:8px"><img src="${escapeHtml(n.imagenUrl)}" alt="" style="max-width:200px;border-radius:6px;border:1px solid #e9ecef;display:block"/></div>` : ''
        const priceHtml = (typeof n.precio !== 'undefined' && n.precio !== null && n.precio !== '')
          ? `<div style="font-weight:600;margin-top:6px;color:${colorPrimary}">Precio: $${Number(n.precio).toFixed(2)}</div>`
          : ''
        return `
          <div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:8px;border-left:3px solid #6c757d;color:${colorTextPrimary}">
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(n.nombre || '')}</div>
            <div style="color:${colorTextSecondary};margin-bottom:6px">${escapeHtml(n.hallazgo || '')} ${escapeHtml(n.comentarios || '')}</div>
            ${priceHtml}
            ${imgHtml}
          </div>
        `
      }).join('')

      return `
        <div style="background:${colorSurface};border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid #e9ecef">
          <h4 style="margin:0 0 12px 0;color:${colorTextPrimary}">${escapeHtml(salon.salon || '')}</h4>
          ${itemsHtml}
        </div>
      `
    }).join('')

    const htmlActa = `<!doctype html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titleText)}</title></head>
      <body style="margin:0;padding:24px;background:${colorBackground};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${colorTextPrimary}">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;background:${colorSurface};border-radius:${borderRadius};overflow:hidden;border:1px solid #eee">
          <tr><td style="padding:18px 20px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:12px">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo" style="height:48px;object-fit:contain;border-radius:6px">` : ''}<div style="font-size:20px;font-weight:700;color:${colorPrimary}">${escapeHtml(titleText)}</div></td></tr>
          <tr><td style="padding:20px">
            <div style="margin-bottom:14px">${generalRows}</div>
            <div style="margin-bottom:12px">${salonesHtml}</div>
          </td></tr>
        </table>
      </body>
      </html>`

    return inline(htmlActa)
  }

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:${colorBackground};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${colorTextPrimary}">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;background:${colorSurface};border-radius:${borderRadius};overflow:hidden;border:1px solid #eee">
      <tr>
        <td style="padding:18px 20px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:12px">
          ${logo ? `<img src="${escapeHtml(logo)}" alt="logo" style="height:36px;object-fit:contain;border-radius:6px">` : ''}
          <div style="font-size:18px;font-weight:700;color:${colorPrimary}">${escapeHtml(title)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px">
          ${intro ? `<div style="margin-bottom:12px;color:${colorTextSecondary}">${escapeHtml(intro)}</div>` : ''}
          ${body && typeof body === 'string' ? `<div style="margin-bottom:12px">${body}</div>` : ''}

          ${itemsHtml ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px">${itemsHtml}</table>` : ''}

          ${ctaHtml}

          ${footer ? `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #f5f5f5;color:${colorTextSecondary};font-size:12px">${escapeHtml(footer)}</div>` : ''}
        </td>
      </tr>
    </table>
    <div style="max-width:720px;margin:12px auto;color:${colorTextSecondary};font-size:12px">¿No esperabas este correo? Puedes ignorarlo.</div>
  </body>
  </html>`

  return inline(html)
}

function escapeHtml(str) {
  if (!str && str !== 0) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function getAccessToken() {
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error('Azure credentials are not configured (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET)')
  }
  const url = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
  const params = new URLSearchParams()
  params.append('client_id', AZURE_CLIENT_ID)
  params.append('client_secret', AZURE_CLIENT_SECRET)
  params.append('scope', 'https://graph.microsoft.com/.default')
  params.append('grant_type', 'client_credentials')

  const res = await fetch(url, { method: 'POST', body: params })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${text}`)
  }
  const json = JSON.parse(text)
  if (!json.access_token) throw new Error('No access_token in token response')
  return json.access_token
}

const handler = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')

    // Optional lightweight secret header to prevent public abuse
    if (FUNCTIONS_SECRET) {
      const header = req.get('x-functions-secret') || req.get('x-functions-token')
      if (!header || header !== FUNCTIONS_SECRET) {
        return res.status(401).json({ error: 'Unauthorized - missing or invalid secret' })
      }
    }

  // Accept either raw HTML in `body` or a `template` object to build a nicer HTML
  const { subject, body, template, to, cc, bcc, from } = req.body || {}
  if (!subject || !(body || template) || !to) return res.status(400).json({ error: 'Missing required fields: subject, body/template, to' })

    const sender = from || MS_GRAPH_FROM_USER
    if (!sender) return res.status(500).json({ error: 'Sender not configured (MS_GRAPH_FROM_USER)' })

    const accessToken = await getAccessToken()

    // Build final HTML content: prefer explicit template object, else raw body
    const htmlContent = buildEmailHtml({ body, template, subject })

    const message = {
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlContent },
        toRecipients: buildRecipients(to),
        ccRecipients: buildRecipients(cc),
        bccRecipients: buildRecipients(bcc)
      },
      saveToSentItems: true
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`
    const r = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!r.ok) {
      const details = await r.text()
      console.error('Graph sendMail error:', r.status, details)
      return res.status(r.status).json({ error: 'Graph API error', details })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('v1SendMail error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Export using v1 API only (Cloud Functions 1st gen)
exports.v1SendMail = functions.https.onRequest(handler)

// Also expose a callable function so the frontend can call via Firebase SDK
// without needing to change Cloud IAM (onCall runs with project's credentials)
exports.sendMailCallable = functions.https.onCall(async (data, context) => {
  // Basic server-side validation similar to handler
  const { subject, body, template, to, cc, bcc, from } = data || {}
  if (!subject || !(body || template) || !to) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: subject, body/template, to')
  }

  // Optional secret check: if configured, require it in data.secret
  if (FUNCTIONS_SECRET) {
    if (!data || data.secret !== FUNCTIONS_SECRET) {
      throw new functions.https.HttpsError('permission-denied', 'Missing or invalid secret')
    }
  }

  // Reuse logic: build message and call Graph
  try {
    const sender = from || MS_GRAPH_FROM_USER
    if (!sender) throw new functions.https.HttpsError('failed-precondition', 'Sender not configured')
    const accessToken = await getAccessToken()

    const htmlContent = buildEmailHtml({ body, template, subject })

    const message = {
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlContent },
        toRecipients: buildRecipients(to),
        ccRecipients: buildRecipients(cc),
        bccRecipients: buildRecipients(bcc)
      },
      saveToSentItems: true
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`
    const r = await fetch(graphUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })

    if (!r.ok) {
      const details = await r.text()
      console.error('Graph sendMail error (callable):', r.status, details)
      throw new functions.https.HttpsError('internal', 'Graph API error', { status: r.status, details })
    }

    return { success: true }
  } catch (err) {
    console.error('sendMailCallable error:', err)
    if (err instanceof functions.https.HttpsError) throw err
    throw new functions.https.HttpsError('internal', err.message)
  }
})

exports.recordatorioReporteDanos = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('America/Costa_Rica')
  .onRun(async () => {
    try {
      const nowUtc = Date.now()
      const snapshot = await dbAdmin.ref('entregas').get()
      if (!snapshot.exists()) return null

      const pending = Object.entries(snapshot.val() || {}).reduce((acc, [id, entrega]) => {
        if (
          !id ||
          !entrega ||
          !entrega.requiereReporteDanos ||
          entrega.reporteDanosEnviado ||
          entrega.recordatorioEnviado
        ) {
          return acc
        }
        const createdAt = entrega.fechaCreacion || entrega.fechaActualizacion
        const businessHours = countBusinessHoursBetween(createdAt, nowUtc)
        if (businessHours >= REMINDER_THRESHOLD_HOURS) {
          acc.push({
            id,
            nombreEvento: entrega.nombreEvento,
            recinto: entrega.recinto,
            fechaCreacion: createdAt,
            businessHours
          })
        }
        return acc
      }, [])

      if (!pending.length) return null

      const recipients = await getRevisionPoolRecipients()
      if (!recipients.length) return null

      await sendDamageReportReminderEmail(pending, recipients)

      const updates = {}
      const nowIso = new Date().toISOString()
      pending.forEach(entry => {
        updates[`entregas/${entry.id}/recordatorioEnviado`] = true
        updates[`entregas/${entry.id}/fechaActualizacion`] = nowIso
      })
      if (Object.keys(updates).length) {
        await dbAdmin.ref().update(updates)
      }

      return null
    } catch (err) {
      console.error('recordatorioReporteDanos error:', err)
      return null
    }
  })
