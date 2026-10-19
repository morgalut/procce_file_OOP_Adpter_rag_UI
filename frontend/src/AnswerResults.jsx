import React from 'react';

export default function AnswerResults({ data }) {
  if (!data) return null;
  const sources = new Map((data.sources || []).map(s => [s.chunk_id, s]));
  return <section className="answer-results" aria-live="polite">
    <h3>Answer</h3><p>{data.answer}</p>
    <h3>Summary</h3><p>{data.summary}</p>
    {data.insufficient_evidence && <p role="status">Insufficient evidence to answer confidently.</p>}
    <h3>Verified source references</h3>
    {data.facts?.length ? <ul>{data.facts.map((fact, i) => <li key={i}>
      <p>{fact.statement}</p><small>{fact.chunk_ids.map(id => {
        const s = sources.get(id);
        return s ? `${s.document_id} · page(s) ${s.page_numbers.join(', ') || 'unknown'} · ${id}` : id;
      }).join(' | ')}</small>
    </li>)}</ul> : <p>No supported facts were returned.</p>}
    <details><summary>Retrieved passages ({data.sources?.length || 0})</summary>
      {(data.sources || []).map(s => <article key={s.chunk_id}><strong>{s.section || 'Document chunk'}</strong><p>{s.text}</p><small>{s.document_id} · pages {s.page_numbers.join(', ')}</small></article>)}
    </details>
  </section>;
}
