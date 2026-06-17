import { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import TableView from './components/TableView.jsx';
import GalleryView from './components/GalleryView.jsx';
import { fetchLocales, exportUrl } from './api.js';

export default function App() {
  const [locales, setLocales] = useState([]);
  const [region, setRegion] = useState('en-US');
  const [seed, setSeed] = useState('1');
  const [likes, setLikes] = useState(2);
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    fetchLocales().then(setLocales).catch(() => {});
  }, []);

  function handleExport() {
    // Exports the first page of the current seed/region/likes settings. Keeping this
    // independent of "whatever table page the user happens to be on" keeps the feature
    // (and its URL) simple and predictable.
    window.location.href = exportUrl({ seed, region, page: 1, pageSize: 20 });
  }

  const viewKey = `${seed}|${region}|${likes}`;

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1 className="app-title">
          Sundial <span className="accent">Records</span>
        </h1>
        <span className="app-subtitle">procedurally generated catalog · seed {seed}</span>
      </div>

      <Toolbar
        locales={locales}
        region={region}
        onRegionChange={setRegion}
        seed={seed}
        onSeedChange={setSeed}
        likes={likes}
        onLikesChange={setLikes}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExport}
      />

      {viewMode === 'table' ? (
        <TableView key={`table-${viewKey}`} seed={seed} region={region} likes={likes} />
      ) : (
        <GalleryView key={`gallery-${viewKey}`} seed={seed} region={region} likes={likes} />
      )}
    </div>
  );
}