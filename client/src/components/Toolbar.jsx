import { IconShuffle, IconTable, IconGrid, IconDownload } from './Icons.jsx';
import { fetchRandomSeed } from '../api.js';

export default function Toolbar({ locales, region, onRegionChange, seed, onSeedChange, likes, onLikesChange, viewMode, onViewModeChange, onExport }) {
  function handleShuffle() {
    fetchRandomSeed().then(({ seed: s }) => onSeedChange(s));
  }

  function handleSeedInput(e) {
    onSeedChange(e.target.value.replace(/[^0-9]/g, ''));
  }

  return (
    <div className="toolbar">
      <div className="toolbar-field">
        <label className="toolbar-label">Language</label>
        <select value={region} onChange={(e) => onRegionChange(e.target.value)}>
          {locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-field">
        <label className="toolbar-label">Seed</label>
        <div className="seed-input-group">
          <input className="text-input seed-input" value={seed} onChange={handleSeedInput} inputMode="numeric" aria-label="Seed value" />
          <button className="icon-button" onClick={handleShuffle} title="Random seed" aria-label="Random seed">
            <IconShuffle />
          </button>
        </div>
      </div>

      <div className="toolbar-field likes-field">
        <label className="toolbar-label">Likes (avg per song)</label>
        <div className="likes-row">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={likes}
            onChange={(e) => onLikesChange(parseFloat(e.target.value))}
            aria-label="Average likes per song"
          />
          <span className="likes-value">{likes.toFixed(1)}</span>
        </div>
      </div>

      <div className="toolbar-spacer" />

      <button className="export-button" onClick={onExport} title="Export current page as MP3s">
        <IconDownload /> Export
      </button>

      <div className="view-toggle">
        <button className={viewMode === 'table' ? 'active' : ''} onClick={() => onViewModeChange('table')} title="Table view" aria-label="Table view">
          <IconTable />
        </button>
        <button className={viewMode === 'gallery' ? 'active' : ''} onClick={() => onViewModeChange('gallery')} title="Gallery view" aria-label="Gallery view">
          <IconGrid />
        </button>
      </div>
    </div>
  );
}