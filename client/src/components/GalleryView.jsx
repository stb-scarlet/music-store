import { useEffect, useRef, useState } from 'react';
import SongDetail from './SongDetail.jsx';
import { IconClose } from './Icons.jsx';
import { fetchSongs, coverUrl } from '../api.js';

const BATCH_SIZE = 24;

export default function GalleryView({ seed, region, likes }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  function loadPage(pageToLoad) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    fetchSongs({ seed, region, likes, page: pageToLoad, pageSize: BATCH_SIZE })
      .then((data) => {
        setItems((prev) => (pageToLoad === 1 ? data.items : [...prev, ...data.items]));
        setPage(pageToLoad);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }

  // Initial batch on mount. This component is remounted (via a `key` in App.jsx) whenever
  // seed/region/likes change, which is what gives us "reset to initial scroll position" —
  // a fresh mount means a fresh, empty grid at the top of the page.
  useEffect(() => {
    loadPage(1);
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadPage(page + 1);
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      <div className="gallery-grid">
        {items.map((item) => (
          <div key={item.token} className="gallery-card" onClick={() => setModalItem(item)}>
            <img className="gallery-cover" src={coverUrl(item.token, 320)} alt={`${item.title} cover`} loading="lazy" />
            <div className="gallery-info">
              <div className="gallery-title">{item.title}</div>
              <div className="gallery-artist">{item.artist}</div>
              <div className="gallery-meta-row">
                <span className="genre-pill">{item.genre}</span>
                <span className="seq-index">#{item.sequenceIndex}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="gallery-sentinel" />
      {loading && <div className="gallery-loading-row">Loading more…</div>}

      {modalItem && (
        <div className="modal-overlay" onClick={() => setModalItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalItem(null)} aria-label="Close">
              <IconClose />
            </button>
            <SongDetail token={modalItem.token} likes={modalItem.likes} />
          </div>
        </div>
      )}
    </div>
  );
}