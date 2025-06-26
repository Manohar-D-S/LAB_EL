import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings, Activity, Clock, Zap, TrendingUp, Siren } from 'lucide-react';

// Dynamic direction type
type Direction = string; // e.g., 'north', 'south', 'east', 'west', etc.

// Dynamic signal state interface
interface SignalState {
  [direction: Direction]: 'red' | 'yellow' | 'green';
}

// Dynamic traffic data interface
interface TrafficData {
  direction: Direction;
  vehicleCount: number;
  waitTime: number;
  priority: number;
  congestionLevel: number;
  avgSpeed: number;
  queueLength: number;
  ambulanceDetected?: boolean; // YOLO model detection
}

// Dynamic signal timing interface
interface SignalTiming {
  phase: string; // e.g., 'NS', 'EW', or any dynamic phase
  duration: number;
  remaining: number;
  nextPhase: string;
  nextDuration: number;
}

// Props for YOLO model detection data
interface TrafficSimulationProps {
  yoloTrafficData: TrafficData[]; // Provided by parent after YOLO detection
  yoloPhases: string[]; // e.g., ['NS', 'EW'] or dynamically generated
  yoloPhaseDirections: { [phase: string]: Direction[] }; // e.g., { NS: ['north', 'south'], EW: ['east', 'west'] }
}

const TrafficSimulation: React.FC<TrafficSimulationProps> = ({
  yoloTrafficData,
  yoloPhases,
  yoloPhaseDirections
}) => {
  const navigate = useNavigate();

  // Fallback: show message for missing videos
  if (
    !yoloTrafficData ||
    !Array.isArray(yoloTrafficData) ||
    yoloTrafficData.length === 0
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="bg-gray-800/70 px-8 py-6 rounded-xl shadow-lg flex flex-col items-center">
          <span className="text-2xl text-white font-bold mb-2">No Videos Uploaded</span>
          <span className="text-gray-300 mb-4">Please upload videos for all directions to enable simulation.</span>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Fallback: show message for missing YOLO detection/phases
  if (
    !yoloPhases ||
    !Array.isArray(yoloPhases) ||
    yoloPhases.length === 0 ||
    !yoloPhaseDirections ||
    Object.keys(yoloPhaseDirections).length === 0
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="bg-gray-800/70 px-8 py-6 rounded-xl shadow-lg flex flex-col items-center">
          <span className="text-2xl text-white font-bold mb-2">Simulation Not Ready</span>
          <span className="text-gray-300 mb-4">YOLO detection or phase data missing. Please run analysis first.</span>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Dynamically get all directions from YOLO data
  const directions = useMemo(() => yoloTrafficData.map(t => t.direction), [yoloTrafficData]);
  const defaultPhase = yoloPhases[0];

  // Initial signal state: all red except first phase directions are green
  const initialSignalState: SignalState = useMemo(() => {
    const state: SignalState = {};
    directions.forEach(dir => {
      state[dir] = yoloPhaseDirections[defaultPhase]?.includes(dir) ? 'green' : 'red';
    });
    return state;
  }, [directions, yoloPhaseDirections, defaultPhase]);

  const [isRunning, setIsRunning] = useState(true);
  const [signalState, setSignalState] = useState<SignalState>(initialSignalState);
  const [timer, setTimer] = useState(45);
  const [currentPhase, setCurrentPhase] = useState<string>(defaultPhase);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [signalTiming, setSignalTiming] = useState<SignalTiming>({
    phase: defaultPhase,
    duration: 45,
    remaining: 45,
    nextPhase: yoloPhases[1 % yoloPhases.length],
    nextDuration: 60
  });
  const [trafficData, setTrafficData] = useState<TrafficData[]>(yoloTrafficData);

  // Update traffic data when YOLO detection changes
  useEffect(() => {
    setTrafficData(yoloTrafficData);
  }, [yoloTrafficData]);

  // Calculate optimal timing based on YOLO data
  const calculateOptimalTiming = (trafficData: TrafficData[], nextPhase: string) => {
    const phaseDirections = yoloPhaseDirections[nextPhase] || [];
    const phaseTraffic = trafficData.filter(t => phaseDirections.includes(t.direction));
    if (phaseTraffic.length === 0) return 30;

    // Ambulance priority: if ambulance detected, set minimum green time
    const ambulanceDetected = phaseTraffic.some(t => t.ambulanceDetected);
    if (ambulanceDetected) return 90; // e.g., 90s green for ambulance

    // ...existing calculation logic...
    const totalVehicles = phaseTraffic.reduce((sum, t) => sum + t.vehicleCount, 0);
    const avgWaitTime = phaseTraffic.reduce((sum, t) => sum + t.waitTime, 0) / phaseTraffic.length;
    const avgCongestion = phaseTraffic.reduce((sum, t) => sum + t.congestionLevel, 0) / phaseTraffic.length;
    const totalQueueLength = phaseTraffic.reduce((sum, t) => sum + t.queueLength, 0);
    const avgSpeed = phaseTraffic.reduce((sum, t) => sum + t.avgSpeed, 0) / phaseTraffic.length;
    const baseDuration = 30;
    const vehicleFactor = Math.min(totalVehicles * 2, 40);
    const waitTimeFactor = Math.min(avgWaitTime / 5, 25);
    const congestionFactor = Math.min(avgCongestion * 30, 30);
    const queueFactor = Math.min(totalQueueLength * 1.5, 20);
    const speedFactor = Math.max(0, (60 - avgSpeed) / 3);
    const emergencyMultiplier = avgCongestion > 0.8 ? 1.3 : 1;
    const calculatedDuration = Math.round(
      (baseDuration + vehicleFactor + waitTimeFactor + congestionFactor + queueFactor + speedFactor) * emergencyMultiplier
    );
    return Math.max(20, Math.min(120, calculatedDuration));
  };

  // Main signal control logic (dynamic phases)
  useEffect(() => {
    if (!isRunning || isTransitioning) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setIsTransitioning(true);

          // Find next phase
          const currentPhaseIdx = yoloPhases.indexOf(currentPhase);
          const nextPhase = yoloPhases[(currentPhaseIdx + 1) % yoloPhases.length];
          const nextDuration = calculateOptimalTiming(trafficData, nextPhase);

          // Set yellow for current phase directions
          const yellowState: SignalState = { ...signalState };
          directions.forEach(dir => {
            if (yoloPhaseDirections[currentPhase]?.includes(dir)) {
              yellowState[dir] = 'yellow';
            } else {
              yellowState[dir] = 'red';
            }
          });
          setSignalState(yellowState);

          // After 2 seconds, switch to next phase (shorter yellow for realism)
          setTimeout(() => {
            const newState: SignalState = {};
            directions.forEach(dir => {
              newState[dir] = yoloPhaseDirections[nextPhase]?.includes(dir) ? 'green' : 'red';
            });
            setSignalState(newState);
            setCurrentPhase(nextPhase);
            setSignalTiming({
              phase: nextPhase,
              duration: nextDuration,
              remaining: nextDuration,
              nextPhase: yoloPhases[(yoloPhases.indexOf(nextPhase) + 1) % yoloPhases.length],
              nextDuration: calculateOptimalTiming(trafficData, yoloPhases[(yoloPhases.indexOf(nextPhase) + 1) % yoloPhases.length])
            });
            setIsTransitioning(false);
          }, 2000);

          return nextDuration;
        }

        setSignalTiming(prev => ({
          ...prev,
          remaining: prev.remaining - 1
        }));

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentPhase, trafficData, isTransitioning, yoloPhases, yoloPhaseDirections, directions, signalState]);

  // Reset simulation to YOLO initial state
  const resetSimulation = () => {
    setSignalState(initialSignalState);
    setTimer(45);
    setCurrentPhase(defaultPhase);
    setIsTransitioning(false);
    setSignalTiming({
      phase: defaultPhase,
      duration: 45,
      remaining: 45,
      nextPhase: yoloPhases[1 % yoloPhases.length],
      nextDuration: 60
    });
  };

  // Helper for signal color
  const getSignalColor = (state: 'red' | 'yellow' | 'green') => {
    switch (state) {
      case 'red': return 'bg-red-500 border-red-700';
      case 'yellow': return 'bg-yellow-400 border-yellow-600';
      case 'green': return 'bg-green-500 border-green-700';
    }
  };

  // Compact, realistic traffic light UI
  const TrafficLight = ({ state, ambulance }: { state: 'red' | 'yellow' | 'green'; ambulance?: boolean }) => (
    <div className="flex flex-col items-center space-y-1">
      <div className={`w-4 h-4 rounded-full border-2 ${getSignalColor('red')} ${state === 'red' ? '' : 'opacity-30'}`}></div>
      <div className={`w-4 h-4 rounded-full border-2 ${getSignalColor('yellow')} ${state === 'yellow' ? '' : 'opacity-30'}`}></div>
      <div className={`w-4 h-4 rounded-full border-2 ${getSignalColor('green')} ${state === 'green' ? '' : 'opacity-30'}`}></div>
      {ambulance && <Siren className="w-4 h-4 text-blue-500 animate-pulse mt-1" />}
    </div>
  );

  // Calculate overall performance metrics from YOLO data
  const totalVehicles = trafficData.reduce((sum, t) => sum + t.vehicleCount, 0);
  const avgWaitTime = trafficData.reduce((sum, t) => sum + t.waitTime, 0) / (trafficData.length || 1);
  const avgCongestion = trafficData.reduce((sum, t) => sum + t.congestionLevel, 0) / (trafficData.length || 1);
  const trafficFlowEfficiency = Math.max(0, 100 - (avgCongestion * 100));
  const waitTimeReduction = Math.max(0, 100 - (avgWaitTime / 1.2));
  const systemEfficiency = (trafficFlowEfficiency + waitTimeReduction) / 2;

  // Helper for congestion color
  const getCongestionColor = (level: number) => {
    if (level <= 0.3) return 'text-green-500';
    if (level <= 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Dynamic intersection layout: arrange directions in a circle
  const intersectionDirections = directions.length > 0 ? directions : ['north', 'south', 'east', 'west'];
  const angleStep = 360 / intersectionDirections.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Intelligent Traffic Signal Control</h1>
                <p className="text-gray-400">AI-Powered Adaptive Intersection Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isRunning ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Realistic Intersection Visualization */}
          <div className="xl:col-span-2 flex flex-col items-center">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 flex flex-col items-center">
              <h2 className="text-xl font-bold text-white mb-6">Smart Intersection Control</h2>
              <div className="relative w-80 h-80 mx-auto flex items-center justify-center">
                {/* Center circle */}
                <div className="absolute left-1/2 top-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 border-4 border-gray-700 z-10 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{timer}s</span>
                </div>
                {/* Directions in a circle */}
                {intersectionDirections.map((dir, idx) => {
                  const angle = angleStep * idx - 90;
                  const rad = (angle * Math.PI) / 180;
                  const x = 120 * Math.cos(rad);
                  const y = 120 * Math.sin(rad);
                  const traffic = trafficData.find(t => t.direction === dir);
                  return (
                    <div
                      key={dir}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <TrafficLight
                        state={signalState[dir]}
                        ambulance={traffic?.ambulanceDetected}
                      />
                      <span className="text-xs text-white mt-1 capitalize">{dir}</span>
                      <span className="text-xs text-gray-400">🚗 {traffic?.vehicleCount ?? 0}</span>
                      {traffic?.ambulanceDetected && (
                        <span className="text-xs text-blue-400 font-bold">Ambulance</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Phase indicator */}
              <div className="mt-8 text-center">
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  {yoloPhases.map(phase => (
                    <div key={phase} className={`p-4 rounded-lg border-2 transition-all ${
                      currentPhase === phase
                        ? 'bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20'
                        : 'bg-gray-700/30 border-gray-600'
                    }`}>
                      <div className={`font-bold text-lg ${currentPhase === phase ? 'text-green-500' : 'text-gray-400'}`}>
                        {phase}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">
                        {currentPhase === phase
                          ? `${timer}s remaining`
                          : `Next: ${signalTiming.nextPhase === phase ? signalTiming.nextDuration : 'TBD'}s`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Control Panel */}
          <div className="space-y-6">
            {/* Real-time Traffic Data */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Live Traffic Data</h3>
              <div className="space-y-4">
                {trafficData.map(traffic => (
                  <div key={traffic.direction} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium capitalize">{traffic.direction}</span>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        traffic.priority <= 2 ? 'bg-green-500/20 text-green-500' :
                        traffic.priority <= 3 ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        Priority {traffic.priority}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Vehicles:</span>
                        <span className="text-white ml-2 font-semibold">{traffic.vehicleCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Queue:</span>
                        <span className="text-white ml-2 font-semibold">{traffic.queueLength}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Wait:</span>
                        <span className="text-white ml-2 font-semibold">{traffic.waitTime}s</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Speed:</span>
                        <span className="text-white ml-2 font-semibold">{traffic.avgSpeed} km/h</span>
                      </div>
                      {traffic.ambulanceDetected && (
                        <div className="col-span-2 flex items-center mt-2 text-blue-400 font-bold">
                          <Siren className="w-4 h-4 mr-1 animate-pulse" /> Ambulance Detected
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Congestion</span>
                        <span className={getCongestionColor(traffic.congestionLevel)}>
                          {(traffic.congestionLevel * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            traffic.congestionLevel <= 0.3 ? 'bg-green-500' :
                            traffic.congestionLevel <= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${traffic.congestionLevel * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-green-500" />
                    <span className="text-white">AI Control</span>
                  </div>
                  <span className="text-green-500 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-white">Next Switch</span>
                  </div>
                  <span className="text-blue-500 font-medium">{timer}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings className="w-5 h-5 text-purple-500" />
                    <span className="text-white">Mode</span>
                  </div>
                  <span className="text-purple-500 font-medium">Adaptive</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className="text-white">Total Vehicles</span>
                  </div>
                  <span className="text-yellow-500 font-medium">{totalVehicles}</span>
                </div>
              </div>
            </div>

            {/* Enhanced Performance Metrics */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Performance Analytics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Traffic Flow Efficiency</span>
                    <span className="text-white font-semibold">{trafficFlowEfficiency.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${trafficFlowEfficiency}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Wait Time Optimization</span>
                    <span className="text-white font-semibold">{waitTimeReduction.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${waitTimeReduction}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Overall System Efficiency</span>
                    <span className="text-white font-semibold">{systemEfficiency.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${systemEfficiency}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-600">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-400">Avg Congestion:</span>
                    <span className={`text-sm font-semibold ${getCongestionColor(avgCongestion)}`}>
                      {(avgCongestion * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulation;