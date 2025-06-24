import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface AlgorithmComparisonModalProps {
  onClose: () => void;
  comparisonData: any | null;
}

const AlgorithmComparisonModal: React.FC<AlgorithmComparisonModalProps> = ({ onClose, comparisonData }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">Routing Algorithm Comparison</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {comparisonData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h3 className="text-lg font-medium text-indigo-800 mb-2">A* Algorithm</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Computation Time:</span>
                      <span className="font-semibold text-slate-800">{comparisonData.astar.computation_time.toFixed(4)} sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Distance:</span>
                      <span className="font-semibold text-slate-800">{comparisonData.astar.distance_km.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Path Nodes:</span>
                      <span className="font-semibold text-slate-800">{comparisonData.astar.node_count}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                  <h3 className="text-lg font-medium text-rose-800 mb-2">Dijkstra Algorithm</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Computation Time:</span>
                      <span className="font-semibold text-slate-800">{comparisonData.dijkstra.computation_time.toFixed(4)} sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Distance:</span>
                      <span className="font-semibold text-slate-800">{comparisonData.dijkstra.distance_km.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Path Nodes:</span>
                      <span className="font-semibold text-slate-800">{comparisonData.dijkstra.node_count}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium text-slate-800 mb-3">Performance Comparison</h3>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Computation Time Comparison</p>
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                        {comparisonData.astar.computation_time <= comparisonData.dijkstra.computation_time ? (
                          <>
                            <div 
                              className="h-full bg-indigo-500 rounded-r-full relative"
                              style={{ 
                                width: '100%'
                              }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                A* ({comparisonData.astar.computation_time.toFixed(4)}s)
                              </span>
                            </div>
                            <div 
                              className="h-full bg-rose-500 rounded-r-full relative -mt-6"
                              style={{ 
                                width: `${(comparisonData.dijkstra.computation_time / comparisonData.astar.computation_time) * 100}%`
                              }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                Dijkstra ({comparisonData.dijkstra.computation_time.toFixed(4)}s)
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div 
                              className="h-full bg-rose-500 rounded-r-full relative"
                              style={{ 
                                width: '100%'
                              }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                Dijkstra ({comparisonData.dijkstra.computation_time.toFixed(4)}s)
                              </span>
                            </div>
                            <div 
                              className="h-full bg-indigo-500 rounded-r-full relative -mt-6"
                              style={{ 
                                width: `${(comparisonData.astar.computation_time / comparisonData.dijkstra.computation_time) * 100}%`
                              }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                A* ({comparisonData.astar.computation_time.toFixed(4)}s)
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm text-slate-600 mb-2">Analysis</p>
                      <p className="text-slate-700">
                        {comparisonData.astar.computation_time < comparisonData.dijkstra.computation_time ? (
                          <>
                            A* is <span className="font-semibold text-indigo-600">
                              {((comparisonData.dijkstra.computation_time / comparisonData.astar.computation_time) - 1) * 100 > 1 ?
                                ((comparisonData.dijkstra.computation_time / comparisonData.astar.computation_time) - 1).toFixed(2) + 'x' : 
                                ((comparisonData.dijkstra.computation_time / comparisonData.astar.computation_time - 1) * 100).toFixed(0) + '%'} faster
                            </span> than Dijkstra for this route. A* uses a heuristic function to guide the search, which improves efficiency for long routes.
                          </>
                        ) : (
                          <>
                            Dijkstra is <span className="font-semibold text-rose-600">
                              {((comparisonData.astar.computation_time / comparisonData.dijkstra.computation_time) - 1) * 100 > 1 ?
                                ((comparisonData.astar.computation_time / comparisonData.dijkstra.computation_time) - 1).toFixed(2) + 'x' : 
                                ((comparisonData.astar.computation_time / comparisonData.dijkstra.computation_time - 1) * 100).toFixed(0) + '%'} faster
                            </span> than A* for this route. This is unusual and might be due to a simple path or overhead in the heuristic calculation.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
              <h3 className="text-lg font-medium text-slate-800 mb-1">No comparison data available</h3>
              <p className="text-slate-600 max-w-md">
                Please calculate a route first to see algorithm performance data. Both algorithms will run and their performance metrics will be displayed here.
              </p>
            </div>
          )}
        </div>
        
        <div className="border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmComparisonModal;
