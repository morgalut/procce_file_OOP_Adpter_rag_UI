import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileSearch, XCircle } from 'lucide-react';
import { diagnosticsFor, extractionState, metadataCount } from './metadataView.js';

const labels = {
  customer_name: 'Customer name', reporting_period: 'Reporting period',
  executive_summary: 'Executive summary', goals: 'Goals', kpis: 'KPIs',
  achievements: 'Achievements', challenges: 'Challenges', risks: 'Risks',
  next_steps: 'Next steps', customer_evidence: 'Customer evidence',
  period_evidence: 'Period evidence', summary_evidence: 'Summary evidence',
};
const display = value => value == null || value === '' ? 'Not available' : String(value);
function Evidence({items}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return <details className="meta-evidence"><summary>Evidence ({items.length})</summary>{items.map((e,i)=><blockquote key={i}>{display(e.source_text)}<small>Page {e.page_number ?? '—'} · {e.source_id ?? 'No source ID'} · {e.status ?? 'unverified'}</small></blockquote>)}</details>;
}
function MetadataItem({item}) {
  if (!item || typeof item !== 'object') return <p>{display(item)}</p>;
  return <div className="meta-item"><strong>{display(item.description ?? item.name ?? item.source_text ?? 'Item')}</strong>
    {['previous_value','current_value','unit','period','owner','target_date_text','target_date'].filter(key=>item[key] != null && item[key] !== '').map(key=><p key={key}><span>{key.replaceAll('_',' ')}:</span> {display(item[key])}</p>)}
    {item.page_number != null && <p>Page: {item.page_number}</p>}
    {item.source_id && <p>Source: {item.source_id}</p>}
    <Evidence items={item.evidence}/>
  </div>;
}
export default function MetadataResults({data,error,title}) {
  if (error) return <div className="alert error" role="alert"><XCircle size={17}/>{error}</div>;
  if (data === undefined || data === null) return <div className="empty"><FileSearch size={25}/><p>Results will appear here after you run the operation.</p></div>;
  const state=extractionState(data), diagnostics=diagnosticsFor(data), issues=data.validation?.issues ?? [];
  const Icon=state.kind==='success'?CheckCircle2:state.kind==='processing'?Clock3:state.kind==='neutral'?FileSearch:AlertTriangle;
  return <div className="result metadata-results">
    <div className={`meta-status meta-status-${state.kind}`} role="status"><Icon size={19}/><div><strong>{state.label}</strong><small>{title || 'Document metadata'}{data.filename ? ` · ${data.filename}` : ''}</small></div></div>
    {data.metadata && <><div className="meta-summary"><span><b>{metadataCount(data.metadata)}</b> extracted values / items</span><span><b>{data.fragment_count ?? '—'}</b> fragments</span><span><b>{issues.length}</b> validation issues</span></div>
      {metadataCount(data.metadata)===0 && <div className="meta-empty-warning">The API returned no extracted metadata. This is not a display-only problem. Check fragment and agent diagnostics in the backend.</div>}
      <div className="metadata-grid">{Object.entries(data.metadata).map(([key,value])=><article className="mini-card" key={key}><h4>{labels[key] ?? key.replaceAll('_',' ')}</h4>{Array.isArray(value)?(value.length ? value.map((item,i)=><MetadataItem key={i} item={item}/>) : <span className="muted">Not extracted</span>):<p>{display(value)}</p>}</article>)}</div></>}
    {issues.length>0 && <section className="meta-diagnostics"><h3>Validation issues ({issues.length})</h3>{issues.map((issue,i)=><div key={i} className="meta-diagnostic"><strong>{issue.field_path ?? issue.code ?? 'Validation issue'}</strong><p>{issue.message ?? 'Unknown validation error'}</p><small>{issue.severity ?? 'unknown'} · {issue.code ?? 'unknown'}</small></div>)}</section>}
    {diagnostics.length>0 && <section className="meta-diagnostics"><h3>Fragment diagnostics ({diagnostics.length})</h3>{diagnostics.map((item,i)=><div className="meta-diagnostic" key={item.fragment_id ?? i}><strong>Fragment {item.fragment_index ?? i} · Page {item.page_number ?? '—'}</strong><p>{item.failure_code ?? item.error ?? item.status ?? 'No failure reported'}</p>{Array.isArray(item.warnings) && item.warnings.length>0 && <small>{item.warnings.join(', ')}</small>}</div>)}</section>}
    {data.metadata && !diagnostics.length && state.kind==='warning' && <p className="muted">Fragment-level diagnostics were not included in this API response.</p>}
    <details className="raw"><summary>Raw JSON response</summary><pre>{JSON.stringify(data,null,2)}</pre></details>
  </div>;
}
