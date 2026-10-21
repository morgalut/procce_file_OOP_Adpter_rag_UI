export function extractionState(data) {
  if (!data || typeof data !== 'object') return {kind:'unknown',label:'No response'};
  const status = String(data.status || '').toLowerCase();
  const validation = String(data.validation?.status || '').toLowerCase();
  if (status === 'failed') return {kind:'failed',label:'Extraction failed'};
  if (status === 'review_required' || data.incomplete === true || validation === 'failed') return {kind:'warning',label:'Extraction incomplete — review required'};
  if (status === 'processing' || status === 'pending') return {kind:'processing',label:'Document processing'};
  if (status === 'completed') return {kind:'success',label:'Extraction completed'};
  return {kind:'neutral',label:'Request completed — extraction status unknown'};
}
export function metadataCount(metadata) {
  if (!metadata || typeof metadata !== 'object') return 0;
  return Object.values(metadata).reduce((total,value)=>total + (Array.isArray(value) ? value.length : (value !== null && value !== undefined && value !== '' ? 1 : 0)),0);
}
export function diagnosticsFor(data) {
  if (!data || typeof data !== 'object') return [];
  const candidates = [data.extraction_diagnostics, data.fragment_outcomes, data.fragments];
  return candidates.find(Array.isArray) || [];
}
