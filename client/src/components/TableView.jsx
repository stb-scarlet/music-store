import { Fragment, useEffect, useState } from 'react';
import Pagination from './Pagination.jsx';
import SongDetail from './SongDetail.jsx';
import { IconChevronDown } from './Icons.jsx';
import { fetchSongs } from '../api.js';

const PAGE_SIZE = 20;

export default function TableView({ seed, region, likes }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedToken, setExpandedToken] = useState(null);

  function load(pageToLoad) {
    setLoading(true);
    fetchSongs({ seed, region, likes, page: pageToLoad, pageSize: PAGE_SIZE })
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  // Seed/region/likes changing always jumps back to page 1 (and fetches it directly, rather
  // than via a separate effect reacting to a page-reset — that two-step approach can briefly
  // fetch the *old* page with the *new* params before correcting itself).
  useEffect(() => {
    setPage(1);
    setExpandedToken(null);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, region, likes]);

  function handlePageChange(p) {
    const next = Math.max(1, p);
    setPage(next);
    setExpandedToken(null);
    load(next);
  }

  function toggle(token) {
    setExpandedToken((cur) => (cur === token ? null : token));
  }

  return (
    <div>
      <div className="table-wrap">
        <table className="song-table">
          <thead>
            <tr>
              <th className="chevron-cell"></th>
              <th>#</th>
              <th>Song</th>
              <th>Artist</th>
              <th>Album</th>
              <th>Genre</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={6} style={{ padding: '12px 16px' }}>
                    <div className="skeleton" style={{ height: 18, width: '100%' }} />
                  </td>
                </tr>
              ))}
            {!loading &&
              items.map((item) => (
                <Fragment key={item.token}>
                  <tr className={`song-row${expandedToken === item.token ? ' expanded' : ''}`} onClick={() => toggle(item.token)}>
                    <td className="chevron-cell">
                      <span className={`chevron${expandedToken === item.token ? ' open' : ''}`}>
                        <IconChevronDown />
                      </span>
                    </td>
                    <td className="seq-index">{item.sequenceIndex}</td>
                    <td className="song-title-cell">{item.title}</td>
                    <td>{item.artist}</td>
                    <td>{item.isSingle ? <span className="album-single">Single</span> : item.album}</td>
                    <td>
                      <span className="genre-pill">{item.genre}</span>
                    </td>
                  </tr>
                  {expandedToken === item.token && (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <SongDetail token={item.token} likes={item.likes} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} onPageChange={handlePageChange} />
    </div>
  );
}