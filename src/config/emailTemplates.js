// Renderizador simple del lado del cliente para el HTML del acta, para permitir cambiar las plantillas en el frontend
export function escapeHtml(str) {
  if (!str && str !== 0) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderActaHtml(acta = {}) {
  const logoUrl = acta.logo_url || ''
  const titleText = acta.title || 'Acta de Entrega de Áreas'
  const g = acta.general || {}
  const salones = Array.isArray(acta.salones) ? acta.salones : []

  const colorPrimary = '#2d2d2d'
  const colorBackground = '#fafafa'
  const colorSurface = '#ffffff'
  const colorTextPrimary = '#2d2d2d'
  const colorTextSecondary = '#6b6b6b'
  const borderRadius = '10px'

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

      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Organizador</div>
        <div style="color:${colorTextSecondary}">${escapeHtml(g.organizador || '')}</div>
      </div>

      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Encargado de Entrega</div>
        <div style="color:${colorTextSecondary}">${escapeHtml(g.encargado_entrega || '')}</div>
      </div>

      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Persona que Recibe</div>
        <div style="color:${colorTextSecondary}">${escapeHtml(g.persona_entrega || '')}</div>
      </div>

      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;color:${colorTextPrimary};margin-bottom:6px">Correo</div>
        <div style="color:${colorTextSecondary}">${escapeHtml(g.correo_persona || '')}</div>
      </div>
    </div>
  `


  // calcular total a partir de los precios (si están presentes)
  const total = salones.reduce((acc, salon) => {
    const novedades = Array.isArray(salon.novedades) ? salon.novedades : []
    const sub = novedades.reduce((s, n) => s + (typeof n.precio !== 'undefined' && n.precio !== null && n.precio !== '' ? Number(n.precio) : 0), 0)
    return acc + sub
  }, 0)

  const totalHtml = total > 0 ? `<div style="margin-top:12px;padding:12px;border-radius:8px;background:#fff;border:1px solid #e9ecef;font-weight:700;color:${colorPrimary}">Total daños: $${total.toFixed(2)}</div>` : ''

  const salonesHtml = salones.map(salon => {
    const novedades = Array.isArray(salon.novedades) ? salon.novedades : []
    if (novedades.length === 0) return ''
    const itemsHtml = novedades.map(n => {
      const imgHtml = (Array.isArray(n.imagenUrl) && n.imagenUrl.length > 0) || (n.imagenUrl && !Array.isArray(n.imagenUrl)) ? (Array.isArray(n.imagenUrl) ? n.imagenUrl : [n.imagenUrl]).map((url, idx) => `<div style="margin-top:8px">
        <img src="${escapeHtml(url)}" alt="" style="max-width:200px;border-radius:6px;border:1px solid #e9ecef;display:block"/>
        <div style="margin-top:8px">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:6px 10px;background:#007bff;color:#fff;border-radius:6px;text-decoration:none;font-size:13px">Descargar foto ${idx + 1}</a>
        </div>
      </div>`).join('') : ''
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

  const html = `<!doctype html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titleText)}</title></head>
  <body style="margin:0;padding:24px;background:${colorBackground};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${colorTextPrimary}">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;background:${colorSurface};border-radius:${borderRadius};overflow:hidden;border:1px solid #eee">
      <tr><td style="padding:18px 20px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:12px">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo" style="height:48px;object-fit:contain;border-radius:6px">` : ''}<div style="font-size:20px;font-weight:700;color:${colorPrimary}">${escapeHtml(titleText)}</div></td></tr>
      <tr><td style="padding:20px">
  <div style="margin-bottom:14px">${generalRows}</div>
  ${totalHtml}
  <div style="margin-bottom:12px">${salonesHtml}</div>
      </td></tr>
    </table>
  </body>
  </html>`

  return html.replace(/\s+/g, ' ').trim()
}

export default { renderActaHtml }
