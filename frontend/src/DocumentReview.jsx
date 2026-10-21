import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, FileSearch, LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { api, validUUID } from './api';

const format = value => value === null || value === undefined ? 'Not provided' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const unique = values => [...new Set(values)];

export default function DocumentReview({ initialDocumentId = '', recentDocumentIds = [] }) {
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [reviewId, setReviewId] = useState('');
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decisionIndex, setDecisionIndex] = useState(null);
  const [reason, setReason] = useState('');
  const [decisions, setDecisions] = useState({});
  const [filter, setFilter] = useState('all');

  useEffect(() => { if (validUUID(initialDocumentId)) setDocumentId(initialDocumentId); }, [initialDocumentId]);
  const proposals = Array.isArray(review?.proposals) ? review.proposals : [];
  const counts = useMemo(() => ({
    total: proposals.length,
    pending: proposals.filter(item => item.status === 'PENDING_APPROVAL').length,
    rejected: proposals.filter(item => item.status === 'REJECTED').length,
    conflicts: proposals.filter(item => item.proposal?.action === 'FLAG_CONFLICT').length,
  }), [review]);

  async function execute(key, fn) {
    setBusy(key); setError(''); setNotice('');
    try { return await fn(); }
    catch (err) { setError(err.message || String(err)); return null; }
    finally { setBusy(''); }
  }
  function showReview(value) {
    if (!value || !Array.isArray(value.proposals)) throw new Error('Unexpected review response format');
    setReview(value); setDecisions({}); setDecisionIndex(null); setReason('');
    if (value.review_id) setReviewId(value.review_id);
  }
  async function createReview(event) {
    event.preventDefault();
    if (!validUUID(documentId)) { setError('Enter a valid document UUID.'); return; }
    await execute('create', async () => {
      const value = await api.createDocumentReview(documentId);
      showReview(value);
      setNotice('Document review completed. No metadata was changed.');
    });
  }
  async function loadReview(event) {
    event.preventDefault();
    if (!validUUID(reviewId)) { setError('Enter a valid review UUID.'); return; }
    await execute('load', async () => { showReview(await api.documentReview(reviewId)); });
  }
  async function decide(index, decision) {
    if (!review?.review_id) { setError('This review is not persisted; decisions are unavailable.'); return; }
    if (reason.trim().length < 3) { setError('A decision reason of at least 3 characters is required.'); return; }
    if (decision === 'APPROVE' && proposals[index]?.status !== 'PENDING_APPROVAL') {
      setError('Only evidence-verified proposals can be approved.'); return;
    }
    await execute(`decision-${index}`, async () => {
      const result = await api.decideDocumentReview(review.review_id, index, { decision, reason: reason.trim() });
      setDecisions(current => ({ ...current, [index]: result.decision }));
      setDecisionIndex(null); setReason('');
      setNotice(`${decision === 'APPROVE' ? 'Approval' : 'Rejection'} recorded. Document metadata was not changed.`);
    });
  }
  const visible = proposals.map((item, index) => ({ item, index })).filter(({ item }) =>
    filter === 'all' || (filter === 'pending' && item.status === 'PENDING_APPROVAL') ||
    (filter === 'rejected' && item.status === 'REJECTED') ||
    (filter === 'conflicts' && item.proposal?.action === 'FLAG_CONFLICT'));

  return <div className="review-workspace">
    <section className="panel">
      <div className="panel-heading"><h2>Full-document review</h2><p>Compare source pages, tables and extracted metadata. Review proposals without changing the original record.</p></div>
      <div className="review-inputs">
        <form onSubmit={createReview}>
          <label htmlFor="review-document-id">Document UUID</label>
          <input id="review-document-id" value={documentId} onChange={e => setDocumentId(e.target.value)} list="review-document-ids" placeholder="Document UUID" />
          <datalist id="review-document-ids">{recentDocumentIds.filter(validUUID).map(id => <option key={id} value={id} />)}</datalist>
          <button className="primary" type="submit" disabled={!!busy || !validUUID(documentId)}>{busy === 'create' ? <LoaderCircle size={16} className="spin"/> : <FileSearch size={16}/>} Start review</button>
        </form>
        <form onSubmit={loadReview}>
          <label htmlFor="review-review-id">Existing review UUID</label>
          <input id="review-review-id" value={reviewId} onChange={e => setReviewId(e.target.value)} placeholder="Review UUID" />
          <button className="secondary review-button" type="submit" disabled={!!busy || !validUUID(reviewId)}>{busy === 'load' ? <LoaderCircle size={16} className="spin"/> : <RefreshCw size={16}/>} Load review</button>
        </form>
      </div>
      <p className="info">Review requests require authenticated access. If you receive HTTP 403, the backend has not received a trusted reviewer identity. Approval does not apply metadata changes.</p>
      {error && <div role="alert" className="alert error"><AlertCircle size={17}/><span>{error}</span></div>}
      {notice && <div role="status" className="review-notice"><CheckCircle2 size={17}/>{notice}</div>}
      {!!busy && <p role="status" className="muted">{busy === 'create' ? 'Reviewing the document. Large files may take time…' : 'Contacting the API…'}</p>}
    </section>
    {review ? <>
      <section className="review-summary" aria-label="Review summary">
        {[['Source pages', review.page_count ?? '—'], ['Review batches', review.review_batches ?? '—'], ['Proposals', counts.total], ['Pending approval', counts.pending], ['Rejected evidence', counts.rejected], ['Conflicts', counts.conflicts]].map(([name, value]) => <article key={name}><small>{name}</small><strong>{value}</strong></article>)}
      </section>
      <section className="panel">
        <div className="review-heading"><div><h2>Correction proposals</h2><p className="muted">Review ID: {review.review_id || 'Not persisted — decisions disabled'}</p></div>
          <label className="review-filter">Show <select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="pending">Pending approval</option><option value="rejected">Rejected evidence</option><option value="conflicts">Conflicts</option></select></label>
        </div>
        {visible.length === 0 ? <p className="muted">No proposals match this filter.</p> : <div className="review-proposals">
          {visible.map(({ item, index }) => {
            const p = item.proposal || {};
            const decided = decisions[index];
            const canApprove = item.status === 'PENDING_APPROVAL' && !decided;
            return <article className="review-proposal" key={`${review.review_id || 'new'}-${index}`}>
              <header><div><strong>{p.field_path || 'Unknown field'}</strong><small>Page {p.page_number ?? '—'} · {p.action || 'Review'}</small></div><span className={`review-status ${decided ? 'decided' : item.status === 'REJECTED' ? 'rejected' : 'pending'}`}>{decided || item.status || 'UNKNOWN'}</span></header>
              <p>{p.reason || 'No explanation provided.'}</p>
              <div className="review-values"><div><small>Current</small><pre>{format(p.original_value)}</pre></div><div><small>Proposed</small><pre>{format(p.proposed_value)}</pre></div></div>
              <details><summary>Source evidence and verification</summary><blockquote>{p.source_excerpt || 'No excerpt supplied'}</blockquote><p className="muted">Source ID: {p.source_id || 'Not supplied'} · Evidence: {item.evidence_verified ? 'Excerpt found' : 'Not verified'} · Semantic check: {item.semantic_status || 'Not evaluated'}</p>{item.rejection_reason && <p className="review-warning">Reason: {item.rejection_reason}</p>}</details>
              {!decided && review.review_id && <div className="review-actions"><button type="button" className="secondary review-button" onClick={() => {setDecisionIndex(index === decisionIndex ? null : index);setReason('');setError('');}} disabled={!!busy}><ClipboardCheck size={15}/> Record decision</button></div>}
              {decisionIndex === index && !decided && <div className="review-decision"><label htmlFor={`review-reason-${index}`}>Reason for decision (required)</label><textarea id={`review-reason-${index}`} rows={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain the evidence and rationale" /><div className="review-actions"><button className="primary" type="button" onClick={() => decide(index, 'APPROVE')} disabled={!canApprove || !!busy || reason.trim().length < 3}>Approve proposal</button><button className="secondary review-button" type="button" onClick={() => decide(index, 'REJECT')} disabled={!!busy || reason.trim().length < 3}>Reject proposal</button><button className="review-cancel" type="button" onClick={() => setDecisionIndex(null)}>Cancel</button></div>{!canApprove && <p className="review-warning">This proposal cannot be approved because its evidence was not verified. You may reject it.</p>}</div>}
            </article>;
          })}
        </div>}
      </section>
      <section className="panel"><h2>Unresolved questions</h2>{review.unresolved_questions?.length ? <ul className="review-questions">{unique(review.unresolved_questions).map((q, i) => <li key={i}>{q}</li>)}</ul> : <p className="muted">No unresolved questions were reported. This does not guarantee semantic correctness.</p>}
        <details className="raw"><summary>Review JSON</summary><pre>{JSON.stringify(review, null, 2)}</pre></details>
      </section>
    </> : <div className="review-empty"><ShieldAlert size={27}/><strong>No review loaded</strong><p>Start a review using a document UUID, or load an existing persisted review by its review UUID.</p></div>}
  </div>;
}
