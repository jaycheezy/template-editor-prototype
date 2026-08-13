import { useEffect } from 'react';
import Editor from './components/editor/Editor';
import { flagsFromSearch } from './lib/phases';
import { useFeatureStore } from './store/featureStore';

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

  return <Editor />;
}
