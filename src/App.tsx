import { useState } from 'react';
import { FastScreen } from './components/FastScreen';
import { Menu } from './components/Menu';
import { Setup } from './components/Setup';
import { useCareerStore, type CareerSetup } from './state/careerStore';
import './App.css';

/** Menu → setup → game. A running or finished career opens straight into the game. */
function App() {
  const hasSave = useCareerStore((s) => s.hasSave);
  const newCareer = useCareerStore((s) => s.newCareer);
  const clearSave = useCareerStore((s) => s.clearSave);
  const [picking, setPicking] = useState(false);

  const start = (setup: CareerSetup) => {
    setPicking(false);
    newCareer(setup);
  };

  return (
    <div className="app">
      {picking ? (
        <Setup onDone={start} onCancel={() => setPicking(false)} />
      ) : hasSave ? (
        <FastScreen onNew={() => setPicking(true)} onReset={clearSave} />
      ) : (
        <Menu onStart={() => setPicking(true)} />
      )}
    </div>
  );
}

export default App;
