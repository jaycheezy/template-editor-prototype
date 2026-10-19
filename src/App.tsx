import { lazy, Suspense, useEffect } from 'react';
import Editor from './components/editor/Editor';
import { flagsFromSearch } from './lib/phases';
import { useFeatureStore } from './store/featureStore';

const AdTagOptions = lazy(() => import('./components/ad-tags/AdTagOptions'));

export default function App() {
  useEffect(() => {
    const applyFromUrl = () => {
      const next = flagsFromSearch(window.location.search);
      if (next) useFeatureStore.getState().applyFlags(next);
    };
    applyFromUrl();
    window.addEventListener('popstate', applyFromUrl);
    return () => window.removeEventListener('popstate', applyFromUrl);
  }, []);

  if (new URLSearchParams(window.location.search).get('view') === 'ad-tag-options') {
    return <Suspense fallback={<div style={{ padding: 32 }}>Loading creative strategies…</div>}><AdTagOptions /></Suspense>;
  }

  return <Editor />;
}
