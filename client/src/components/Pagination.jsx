export default function Pagination({ page, onPageChange }) {
  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = page + windowSize;
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="pagination">
      <button className="page-button" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
        «
      </button>
      <button className="page-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
        ‹
      </button>
      {pages.map((p) => (
        <button key={p} className={`page-button${p === page ? ' active' : ''}`} onClick={() => onPageChange(p)}>
          {p}
        </button>
      ))}
      <button className="page-button" onClick={() => onPageChange(page + 1)} aria-label="Next page">
        ›
      </button>
    </div>
  );
}