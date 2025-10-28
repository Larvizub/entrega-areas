const getFunctionsSendMailUrl = () => {
  if (import.meta.env.VITE_FUNCTIONS_SENDMAIL_URL) return import.meta.env.VITE_FUNCTIONS_SENDMAIL_URL
  const base = import.meta.env.VITE_FUNCTIONS_BASE_URL || ''
  if (!base) return '/v1SendMail'
  return base.replace(/\/$/, '') + '/v1SendMail'
}

export const sendMailViaFunction = async (payload = {}) => {
  const url = getFunctionsSendMailUrl()
  const secret = import.meta.env.VITE_FUNCTIONS_SECRET

  const headers = { 'Content-Type': 'application/json' }
  if (secret) headers['x-functions-secret'] = secret

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`sendMailViaFunction failed: ${res.status} ${text}`)
    err.status = res.status
    err.details = text
    throw err
  }

  return res.json()
}

// If Firebase client SDK is available, prefer calling the callable function
export const sendMailViaCallable = async (payload = {}) => {
  try {
    // dynamic import to avoid bundling firebase/functions when not used
    const firebaseAppAvailable = !!(import.meta.env.VITE_FIREBASE_PROJECT_ID)
    if (!firebaseAppAvailable) throw new Error('Firebase client not configured')
    const { getFunctions, httpsCallable } = await import('firebase/functions')
    const app = (await import('./firebase')).default
    const functions = getFunctions(app)
    const fn = httpsCallable(functions, 'sendMailCallable')
    const data = { ...payload }
    // attach secret if present
    if (import.meta.env.VITE_FUNCTIONS_SECRET) data.secret = import.meta.env.VITE_FUNCTIONS_SECRET
    const res = await fn(data)
    return res.data
  } catch (err) {
    // fallback to HTTP endpoint
    return sendMailViaFunction(payload)
  }
}

export const sendEmailWithAccountViaFunction = async (templateParams = {}) => {
  const subject = templateParams.event_name || templateParams.subject || 'Notificación'

  let to = templateParams.to || templateParams.to_email || templateParams.recipients || null
  if (typeof to === 'string') to = to.split(',').map(s => s.trim()).filter(Boolean)

  if (!to) throw new Error('sendEmailWithAccountViaFunction: destinatarios (to) no proporcionados en templateParams')

  const payload = { subject, to }
  if (templateParams.cc) payload.cc = templateParams.cc
  if (templateParams.bcc) payload.bcc = templateParams.bcc

  // If caller provided a full acta/template object, forward it to backend
  if (templateParams.acta) {
    payload.template = { acta: templateParams.acta }
  } else if (templateParams.template) {
    payload.template = templateParams.template
  } else {
    // fallback: send raw HTML/body
    const body = templateParams.novedades_html || templateParams.body || (templateParams.message && `<p>${templateParams.message}</p>`) || '<p>Mensaje desde la aplicación</p>'
    payload.body = body
    if (templateParams.logo_url) payload.logo_url = templateParams.logo_url
  }

  // Prefer callable when possible (no IAM changes needed)
  return sendMailViaCallable(payload)
}

// Compatibilidad: mantener la firma exportada `sendEmailWithAccount(account, templateParams)`
export const sendEmailWithAccount = async (account, templateParams) => {
  // account se conserva por compatibilidad, no se utiliza aquí
  return sendEmailWithAccountViaFunction(templateParams)
}
