import { useEffect, useRef, useState } from 'react';
import AudioPlayer from './AudioPlayer.jsx';
import { fetchSongDetail, coverUrl, audioUrl } from '../api.js';
import { IconThumbUp } from './Icons.jsx';

function findActiveLyricIndex(lyrics, time) {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= time) idx = i;
    else break;
  }
  return idx;
}

export default function SongDetail({ token, likes }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('reviews');
  const [currentTime, setCurrentTime] = useState(0);
  const activeLineRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    fetchSongDetail(token, likes)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail({ error: true });
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch only when the record itself changes; the like count for an already-loaded
    // record is shown from `likes` directly below rather than re-fetching on every slider tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeLyricIndex = detail?.lyrics ? findActiveLyricIndex(detail.lyrics, currentTime) : -1;

  useEffect(() => {
    if (tab === 'lyrics' && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeLyricIndex, tab]);

  if (!detail) {
    return (
      <div className="song-detail">
        <div className="detail-loading">Loading details…</div>
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="song-detail">
        <div className="detail-loading">Couldn't load this song. Try again in a moment.</div>
      </div>
    );
  }

  return (
    <div className="song-detail">
      <div className="detail-cover-wrap">
        <img className="detail-cover" src={coverUrl(token, 420)} alt={`${detail.title} cover`} loading="lazy" />
        <div className="like-badge">
          <IconThumbUp /> {likes}
        </div>
      </div>
      <div className="detail-main">
        <div className="detail-title-row">
          <h3 className="detail-title">{detail.title}</h3>
          <span className="genre-pill">{detail.genre}</span>
        </div>
        <div className="detail-meta-line">
          from <b>{detail.isSingle ? 'Single' : detail.album}</b> by <i>{detail.artist}</i>
        </div>
        <div className="label-year">
          {detail.label}, {detail.year}
        </div>

        <AudioPlayer src={audioUrl(token)} durationHint={detail.durationSec} onTimeUpdate={setCurrentTime} />

        <div className="tabs">
          <button className={`tab-button${tab === 'reviews' ? ' active' : ''}`} onClick={() => setTab('reviews')}>
            Reviews
          </button>
          <button className={`tab-button${tab === 'lyrics' ? ' active' : ''}`} onClick={() => setTab('lyrics')}>
            Lyrics
          </button>
        </div>

        {tab === 'reviews' && (
          <div>
            {detail.reviews.map((r, i) => (
              <div className="review-item" key={i}>
                {r}
              </div>
            ))}
          </div>
        )}

        {tab === 'lyrics' && (
          <div className="lyrics-scroll">
            {detail.lyrics.map((line, i) => (
              <div
                key={i}
                ref={i === activeLyricIndex ? activeLineRef : null}
                className={`lyric-line${i === activeLyricIndex ? ' active' : ''}`}
              >
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}