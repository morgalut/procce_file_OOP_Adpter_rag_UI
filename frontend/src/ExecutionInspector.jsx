import React, {useCallback, useEffect, useState} from 'react';
import {Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock3, RefreshCw, XCircle} from 'lucide-react';
import {api, validUUID} from './api';

const statusName = value => String(value || 'unknown').replaceAll('_',' ').toLowerCase();
const time = value => value ? new Date(value).toLocaleString() : '—';
const ms = value => value == null ? '—' : `${Number(value).toFixed(1)} ms`;
const pretty = value => JSON.stringify(value ?? {}, null, 2);
const EVENT_PAGE_SIZE = 100;
const Icon = ({status}) => {
  const v = String(status || '').toLowerCase();
  if (['completed','success','succeeded'].includes(v)) return <CheckCircle2 size={17} className="ev-ok"/>;
  if (['failed','error'].includes(v)) return <XCircle size={17} className="ev-error"/>;
  if (['running','started','in_progress'].includes(v)) return <Activity size={17} className="ev-running"/>;
  return <Clock3 size={17} className="ev-neutral"/>;
};
export default function ExecutionInspector({initialRunId=''}) {
  const [runId,setRunId] = useState(initialRunId);
  const [documentId,setDocumentId] = useState('');
  const [recentRuns,setRecentRuns] = useState([]);
  const [listing,setListing] = useState(false);
  const [run,setRun] = useState(null);
  const [stages,setStages] = useState([]);
  const [events,setEvents] = useState([]);
  const [busy,setBusy] = useState(false);
  const [moreBusy,setMoreBusy] = useState(false);
  const [error,setError] = useState('');
  const [expanded,setExpanded] = useState({});
  const [autoRefresh,setAutoRefresh] = useState(false);
  const [hasMore,setHasMore] = useState(false);
  const [loadedId,setLoadedId] = useState('');
  useEffect(()=>{if(initialRunId && validUUID(initialRunId))setRunId(initialRunId)},[initialRunId]);

  const load = useCallback(async (id, silent=false) => {
    if (!validUUID(id)) {if(!silent)setError('Enter a valid pipeline run UUID (not the document UUID).');return;}
    if(!silent)setBusy(true);
    try {
      const [r,s,e] = await Promise.all([api.run(id),api.runStages(id),api.runEvents(id,{limit:EVENT_PAGE_SIZE})]);
      setRun(r);setStages(s);setEvents(e);setHasMore(e.length===EVENT_PAGE_SIZE);setLoadedId(id);setError('');
    } catch(err) {if(!silent){setRun(null);setStages([]);setEvents([]);setLoadedId('');setError(err.message);}}
    finally {if(!silent)setBusy(false);}
  },[]);
  useEffect(()=>{
    if(!autoRefresh || !loadedId)return;
    const timer=setInterval(()=>{load(loadedId,true)},5000);
    return ()=>clearInterval(timer);
  },[autoRefresh,loadedId,load]);
  async function findRuns(){
    if(documentId.trim() && !validUUID(documentId.trim())){setError('Document ID must be a valid UUID.');return;}
    setListing(true);
    try{
      const rows=await api.runs({documentId:documentId.trim(),limit:25});
      setRecentRuns(rows);
      setError('');
    }catch(err){setError(err.message)}
    finally{setListing(false)}
  }
  async function more(){
    if(!loadedId || !events.length || moreBusy)return;
    setMoreBusy(true);
    try{
      const next=await api.runEvents(loadedId,{limit:EVENT_PAGE_SIZE,afterId:events[events.length-1].id});
      setEvents(prev=>[...prev,...next.filter(item=>!prev.some(old=>old.id===item.id))]);
      setHasMore(next.length===EVENT_PAGE_SIZE);setError('');
    }catch(err){setError(err.message)}finally{setMoreBusy(false)}
  }
  return <div className="ev-inspector">
    <section className="panel">
      <div className="panel-heading"><h2>Execution history</h2><p>Read-only view of the event-tracking API. Enter a pipeline run ID to inspect its stages.</p></div>
      <form className="ev-toolbar" onSubmit={e=>{e.preventDefault();load(runId)}}>
        <div className="field ev-id"><label htmlFor="ev-run-id">Pipeline run UUID</label><input id="ev-run-id" value={runId} onChange={e=>setRunId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/></div>
        <button className="primary" type="submit" disabled={busy || !validUUID(runId)}><RefreshCw size={16}/>{busy?'Loading…':'Load run'}</button>
        <label className="ev-toggle"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> Auto refresh (5s)</label>
      </form>
      {error&&<div className="alert error" role="alert"><AlertTriangle size={17}/><span>{error}</span></div>}
      <div className="ev-find">
        <div className="field ev-id"><label htmlFor="ev-document-id">Find runs by document ID (optional)</label><input id="ev-document-id" value={documentId} onChange={e=>setDocumentId(e.target.value)} placeholder="Leave empty for latest runs"/></div>
        <button className="secondary" type="button" disabled={listing} onClick={findRuns}>{listing?'Searching…':'Find runs'}</button>
      </div>
      {recentRuns.length>0&&<div className="ev-recent">{recentRuns.map(item=><button key={item.id} type="button" onClick={()=>{setRunId(item.id);load(item.id)}}><Icon status={item.status}/><span><b>{item.pipeline_name}</b><small>{item.id} · {time(item.started_at)}</small></span><ChevronRight size={15}/></button>)}</div>}
      {!run&&!error&&!recentRuns.length&&<div className="empty compact">Find recent runs or enter a pipeline run UUID to begin.</div>}
    </section>
    {run&&<>
      <section className="ev-summary">
        <article><small>PIPELINE</small><strong>{run.pipeline_name || 'QBR pipeline'}</strong><span>{run.id}</span></article>
        <article><small>STATUS</small><strong className="ev-status"><Icon status={run.status}/>{statusName(run.status)}</strong><span>Document: {run.document_id || '—'}</span></article>
        <article><small>STARTED</small><strong>{time(run.started_at)}</strong><span>Finished: {time(run.finished_at)}</span></article>
        <article><small>STAGES / EVENTS</small><strong>{stages.length} / {events.length}{hasMore?' +':''}</strong><span>Events shown oldest first</span></article>
      </section>
      <div className="ev-columns">
        <section className="panel">
          <div className="panel-heading"><h2>Stage timeline</h2><p>Expand any stage to inspect its summaries and error category.</p></div>
          {stages.length===0?<p className="muted">No stages recorded for this run.</p>:<div className="ev-list">{stages.map(stage=>{
            const open=!!expanded[stage.id];
            return <article className="ev-stage" key={stage.id}>
              <button className="ev-stage-head" type="button" aria-expanded={open} onClick={()=>setExpanded(prev=>({...prev,[stage.id]:!open}))}>
                <Icon status={stage.status}/>
                <span className="ev-stage-title"><strong>{stage.stage_name}</strong><small>{stage.fragment_id || `Attempt ${stage.attempt_number || 1}`}</small></span>
                <span className="ev-duration">{ms(stage.duration_ms)}</span>
                {open?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
              </button>
              {open&&<div className="ev-detail">
                <p><b>Status:</b> {statusName(stage.status)} · <b>Attempt:</b> {stage.attempt_number ?? 1}</p>
                <p><b>Started:</b> {time(stage.started_at)} · <b>Finished:</b> {time(stage.finished_at)}</p>
                {stage.error_code&&<p className="ev-failure"><b>Error:</b> {stage.error_code}</p>}
                <details><summary>Input summary</summary><pre>{pretty(stage.input_summary)}</pre></details>
                <details><summary>Output summary</summary><pre>{pretty(stage.output_summary)}</pre></details>
                <small>Stage ID: {stage.id}</small>
              </div>}
            </article>
          })}</div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Event log</h2><p>Persistent event records, including retries and validation failures.</p></div>
          {events.length===0?<p className="muted">No events recorded for this run.</p>:<div className="ev-events">{events.map(event=><details key={event.id} className="ev-event">
            <summary><span className="ev-event-dot"/><span><strong>{event.event_type}</strong><small>{time(event.created_at)} · Event #{event.id}</small></span><ChevronDown size={15}/></summary>
            <div className="ev-detail"><p><b>Stage:</b> {event.stage_id || 'Pipeline'}</p><pre>{pretty(event.event_data)}</pre></div>
          </details>)}</div>}
          {hasMore&&<button className="secondary" type="button" disabled={moreBusy} onClick={more}>{moreBusy?'Loading…':'Load older events'}</button>}
        </section>
      </div>
    </>}
  </div>;
}
