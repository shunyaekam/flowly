'use client';

import { useAppStore } from '@/lib/store';
import InputView from '@/components/InputView';
import StoryboardView from '@/components/StoryboardView';
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  const { currentView, showSettings, setShowSettings } = useAppStore();

  return (
    <main className="min-h-screen bg-white">
      {currentView === 'input' ? (
        <InputView />
      ) : (
        <StoryboardView />
      )}
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </main>
  );
}
