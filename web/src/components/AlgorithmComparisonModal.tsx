import React from 'react';

interface AlgorithmResult {
  algorithm: string;
  time: number;
  nodes: number;
  distance: number;
  // route: [number, number][];
}

interface AlgorithmComparisonModalProps {
  onClose: () => void;
  comparisonData: AlgorithmResult[];
}

const AlgorithmComparisonModal: React.FC<AlgorithmComparisonModalProps> = ({ onClose, comparisonData }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-6 text-slate-800">Routing Algorithm Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comparisonData.map(result => (
            <div key={result.algorithm} className="bg-slate-50 rounded-lg p-4 border">
              <h3 className="text-lg font-bold mb-2">{result.algorithm}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Computation Time:</span>
                  <span className="font-semibold text-slate-800">{result.time.toFixed(4)} sec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Distance:</span>
                  <span className="font-semibold text-slate-800">{result.distance.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Path Nodes:</span>
                  <span className="font-semibold text-slate-800">{result.nodes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlgorithmComparisonModal;
