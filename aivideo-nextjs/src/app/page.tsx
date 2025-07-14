'use client';

import { useAppStore } from '@/lib/store';
import InputView from '@/components/InputView';
import StoryboardView from '@/components/StoryboardView';
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  const { currentView } = useAppStore();

  return (
    <main>
      {currentView === 'input' && <InputView />}
      {currentView === 'storyboard' && <StoryboardView />}
      <SettingsModal />
    </main>
  );
}
