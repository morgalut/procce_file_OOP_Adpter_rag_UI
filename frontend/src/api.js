export const API_ROOT = '/api/v1/qbr';
export const validUUID = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function apiRequest(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(path, { ...options, headers: { Accept: 'application/json', ...(!isForm && options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : null; } catch { result = { detail: raw.slice(0, 3000) }; }
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${typeof result?.detail === 'string' ? result.detail : JSON.stringify(result?.detail ?? result)}`);
  return result;
}
export const api = {
  health: () => apiRequest('/health'),
  runs: ({documentId='',limit=25}={}) => apiRequest(`${API_ROOT}/runs?limit=${limit}${documentId ? `&document_id=${encodeURIComponent(documentId)}` : ''}`),
  run: runId => apiRequest(`${API_ROOT}/runs/${encodeURIComponent(runId)}`),
  runStages: runId => apiRequest(`${API_ROOT}/runs/${encodeURIComponent(runId)}/stages`),
  runEvents: (runId, {limit=100, afterId=0}={}) => apiRequest(`${API_ROOT}/runs/${encodeURIComponent(runId)}/events?limit=${limit}&after_id=${afterId}`),
  schema: () => apiRequest('/openapi.json'),
  upload: file => { const body = new FormData(); body.append('file', file, file.name); return apiRequest(`${API_ROOT}/documents`, { method: 'POST', body }); },
  document: id => apiRequest(`${API_ROOT}/documents/${encodeURIComponent(id)}`),
  createDocumentReview: id => apiRequest(`${API_ROOT}/documents/${encodeURIComponent(id)}/review`, { method: 'POST' }),
  documentReview: reviewId => apiRequest(`${API_ROOT}/documents/reviews/${encodeURIComponent(reviewId)}`),
  decideDocumentReview: (reviewId, proposalIndex, payload) => apiRequest(`${API_ROOT}/documents/reviews/${encodeURIComponent(reviewId)}/proposals/${proposalIndex}/decision`, { method: 'POST', body: JSON.stringify(payload) }),
  validation: id => apiRequest(`${API_ROOT}/documents/${encodeURIComponent(id)}/validation`),
  vectors: id => apiRequest(`${API_ROOT}/documents/${encodeURIComponent(id)}/prepare-vectors`, { method: 'POST' }),
  search: data => apiRequest(`${API_ROOT}/search`, { method: 'POST', body: JSON.stringify(data) }),
  answer: data => apiRequest(`${API_ROOT}/search/answer`, { method: 'POST', body: JSON.stringify(data) }),
};
export function operationsFromSchema(schema) {
  return Object.entries(schema?.paths ?? {}).flatMap(([path, methods]) => Object.entries(methods).filter(([method]) => ['get','post','put','patch','delete'].includes(method)).map(([method, operation]) => ({ path, method: method.toUpperCase(), operation })));
}
