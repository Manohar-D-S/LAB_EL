import React from 'react';
import L from 'leaflet';

interface SimulationBarProps {
  progress: number;
  distanceCovered: number;
  totalDistance: number;
  isSimulationActive: boolean;
  onStart: () => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

const speedOptions = [1, 2, 3, 4];

const SimulationBar: React.FC<SimulationBarProps> = ({
  progress,
  distanceCovered,
  totalDistance,
  isSimulationActive,
  onStart,
  speed,
  onSpeedChange
}) => {
  return (
    <div
      className="fixed left-auto !right-6 z-30"
      style={{ top: 'calc(50% + 240px)', right: '1.5rem', minWidth: 420, maxWidth: 600, width: '38vw', pointerEvents: 'auto' }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Simulation</span>
          <span className="text-lg font-bold text-gray-800">
            {Math.round(progress * 100)}% Distance Covered
          </span>
          <span className="text-xs text-gray-400">
            {distanceCovered.toFixed(2)} km / {totalDistance.toFixed(2)} km
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            ></div>
          </div>
          {typeof speed === 'number' && onSpeedChange && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-500">Speed</span>
              <div className="flex gap-2">
                {speedOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      speed === opt
                        ? 'bg-blue-600 text-white border-blue-700 shadow'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-100'
                    }`}
                    onClick={() => onSpeedChange(opt)}
                    disabled={isSimulationActive}
                  >
                    {opt}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className={`ml-4 px-6 py-2 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${
            isSimulationActive
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          onClick={onStart}
          disabled={isSimulationActive}
        >
          {isSimulationActive ? 'Running...' : 'Start'}
        </button>
      </div>
    </div>
  );
};

export default SimulationBar;
