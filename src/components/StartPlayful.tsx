import React, { useState } from 'react';
import { Player } from './Gomoku3DBoard';
import './StartPlayful.css';

export type GameDimension = '2d' | '3d';

interface Props {
  onStart: (dimension: GameDimension, humanPlayer: Player) => void;
}

export const StartPlayful: React.FC<Props> = ({ onStart }) => {
  const [step, setStep] = useState<'mode' | 'stone'>('mode');
  const [dimension, setDimension] = useState<GameDimension>('2d');

  const handlePickMode = (dim: GameDimension) => {
    setDimension(dim);
    setStep('stone');
  };

  const handleBack = () => {
    setStep('mode');
  };

  return (
    <div className="playful-root">
      <header className="playful-header">
        <div className="playful-logo">
          <span className="playful-logo-badge">G</span>
          gomoku
        </div>
        <button className="playful-help">?</button>
      </header>

      <main className="playful-main">
        {step === 'mode' ? (
          <div className="playful-picker">
            <div className="playful-chip">gomoku</div>
            <div className="playful-picker-label">Choose your mode</div>
            <div className="playful-teams">
              <button
                className="playful-team"
                onClick={() => handlePickMode('2d')}
              >
                <div className="playful-mode-icon playful-mode-2d">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <line x1="4" y1="14" x2="44" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="4" y1="34" x2="44" y2="34" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="14" y1="4" x2="14" y2="44" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="34" y1="4" x2="34" y2="44" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                  </svg>
                </div>
                <div className="playful-team-name">Classic</div>
              </button>

              <div className="playful-vs">OR</div>

              <button
                className="playful-team playful-team-wip"
                onClick={() => {/* disabled for users */}}
                onDoubleClick={() => handlePickMode('3d')}
              >
                <div className="playful-mode-icon playful-mode-3d">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M12 36 L4 28 L4 8 L24 4 L44 8 L44 28 L36 36 L24 44 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M4 8 L24 16 L44 8" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="24" y1="16" x2="24" y2="44" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                    <path d="M12 12 L12 36" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                    <path d="M36 12 L36 36" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                  </svg>
                </div>
                <div className="playful-team-name">3D Advanced</div>
                <div className="playful-team-badge badge-wip">Coming Soon</div>
              </button>
            </div>

            <div className="playful-tagline">
              Line up <span className="playful-title-yellow">five</span> and <span className="playful-title-pink">win.</span>
            </div>
            <div className="playful-features-row">
              <div className="playful-feature">Smart AI</div>
              <div className="playful-feature">Quick games</div>
            </div>
          </div>
        ) : (
          <div className="playful-picker">
            <div className="playful-chip">
              {dimension === '2d' ? 'classic 2D' : '3D advanced'}
            </div>
            <div className="playful-picker-label">Choose your stone to begin</div>
            <div className="playful-teams">
              <button
                className="playful-team"
                onClick={() => onStart(dimension, 1)}
              >
                <div className="playful-team-stone playful-team-stone-black" />
                <div className="playful-team-name">Black</div>
                <div className="playful-team-badge">you move first</div>
              </button>

              <div className="playful-vs">VS</div>

              <button
                className="playful-team"
                onClick={() => onStart(dimension, 2)}
              >
                <div className="playful-team-stone playful-team-stone-white" />
                <div className="playful-team-name">White</div>
                <div className="playful-team-badge">AI moves first</div>
              </button>
            </div>

            <div className="playful-tagline">
              Line up <span className="playful-title-yellow">five</span> and <span className="playful-title-pink">win.</span>
            </div>

            <button className="playful-back" onClick={handleBack}>
              ← back to mode selection
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
