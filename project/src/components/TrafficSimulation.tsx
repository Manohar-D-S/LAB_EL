import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings, Activity, Clock, Zap, TrendingUp, Siren, AlertTriangle, Download } from 'lucide-react';

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
  annotatedVideoUrl?: string; // Optional property for annotated video URL
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

  // --- New state for backend integration ---
  const [videoFiles, setVideoFiles] = useState<{ [key: string]: File | null }>({
    north: null,
    south: null,
    east: null,
    west: null,
  });
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- System status from backend ---
  const [detectorStats, setDetectorStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
            onClick={() => navigate(0)}
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
            onClick={() => navigate(0)}
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

  // Handler for file input
  const handleFileChange = (direction: string, file: File | null) => {
    setVideoFiles(prev => ({ ...prev, [direction]: file }));
  };

  // Use the API base from integration summary
  const API_BASE = 'http://localhost:5001'; // Update if backend runs elsewhere

  // --- API: GET /api/health ---
  const getApiHealth = async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('API health check failed');
    return res.json();
  };

  // --- API: GET /api/detector/stats ---
  const getDetectorStats = async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/api/detector/stats`);
    if (!res.ok) throw new Error('Detector stats fetch failed');
    return res.json();
  };

  // --- API: POST /api/detect/image ---
  const detectImage = async (
    file: File,
    onResult: (result: any) => void,
    onError: (err: string) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/detect/image`, {
        method: 'POST',
        body: formData,
        credentials: 'omit'
      });
      if (!res.ok) throw new Error('Image detection failed');
      const result = await res.json();
      onResult(result);
    } catch (err: any) {
      onError(err.message || 'Image detection error');
    }
  };

  // --- API: POST /api/detect/video ---
  const detectVideo = async (
    file: File,
    onResult: (result: any) => void,
    onError: (err: string) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/detect/video`, {
        method: 'POST',
        body: formData,
        credentials: 'omit'
      });
      if (!res.ok) throw new Error('Video detection failed');
      const result = await res.json();
      onResult(result);
    } catch (err: any) {
      onError(err.message || 'Video detection error');
    }
  };

  // --- API: POST /api/analyze/intersection ---
  const analyzeIntersection = async (
    videos: { north: File; south: File; east: File; west: File },
    intersectionId: string,
    onResult: (result: any) => void,
    onError: (err: string) => void
  ) => {
    const formData = new FormData();
    formData.append('video_north', videos.north);
    formData.append('video_south', videos.south);
    formData.append('video_east', videos.east);
    formData.append('video_west', videos.west);
    formData.append('intersection_id', intersectionId);
    try {
      const res = await fetch(`${API_BASE}/api/analyze/intersection`, {
        method: 'POST',
        body: formData,
        credentials: 'omit'
      });
      if (!res.ok) throw new Error('Intersection analysis failed');
      const result = await res.json();
      onResult(result);
    } catch (err: any) {
      onError(err.message || 'Intersection analysis error');
    }
  };

  // --- API: POST /api/signal-control ---
  const signalControl = async (
    data: { analysis_id: string; priority_direction: string; emergency_override: boolean },
    onResult: (result: any) => void,
    onError: (err: string) => void
  ) => {
    try {
      const res = await fetch(`${API_BASE}/api/signal-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'omit'
      });
      if (!res.ok) throw new Error('Signal control failed');
      const result = await res.json();
      onResult(result);
    } catch (err: any) {
      onError(err.message || 'Signal control error');
    }
  };

  // --- API: POST /api/detector/settings ---
  const updateDetectorSettings = async (
    settings: { confidence?: number; nms?: number },
    onResult: (result: any) => void,
    onError: (err: string) => void
  ) => {
    try {
      const res = await fetch(`${API_BASE}/api/detector/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'omit'
      });
      if (!res.ok) throw new Error('Update settings failed');
      const result = await res.json();
      onResult(result);
    } catch (err: any) {
      onError(err.message || 'Update settings error');
    }
  };

  // Example: image detection integration
  const detectImageIntegration = (file: File) => {
    detectImage(
      file,
      (result) => {
        console.log('Image detection result:', result);
        // Handle result (e.g., update UI, show alerts)
      },
      (err) => {
        console.error('Image detection error:', err);
        // Handle error (e.g., show notification)
      }
    );
  };

  // Example: video detection integration
  const detectVideoIntegration = (file: File) => {
    detectVideo(
      file,
      (result) => {
        console.log('Video detection result:', result);
        // Handle result (e.g., update UI, show alerts)
      },
      (err) => {
        console.error('Video detection error:', err);
        // Handle error (e.g., show notification)
      }
    );
  };

  // Example: intersection analysis integration
  const analyzeIntersectionIntegration = () => {
    if (Object.values(videoFiles).some(f => !f)) {
      setError('Please upload all videos for analysis');
      return;
    }
    setError(null);
    setLoading(true);
    analyzeIntersection(
      {
        north: videoFiles.north as File,
        south: videoFiles.south as File,
        east: videoFiles.east as File,
        west: videoFiles.west as File,
      },
      'main_intersection',
      (result) => {
        setAnalysisResult(result);
        setLoading(false);
        // Example: auto-start simulation with new data
        // startSimulationWithNewData(result.traffic_data, result.phases, result.phase_directions);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
  };

  // Example: signal control integration (emergency mode)
  const triggerEmergencyMode = (direction: string) => {
    signalControl(
      {
        analysis_id: 'main_intersection',
        priority_direction: direction,
        emergency_override: true,
      },
      (result) => {
        console.log('Signal control result:', result);
        // Handle result (e.g., update UI, show alerts)
      },
      (err) => {
        console.error('Signal control error:', err);
        // Handle error (e.g., show notification)
      }
    );
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

  // Ambulance alert state
  const [showAmbulanceAlert, setShowAmbulanceAlert] = useState(false);

  // Show ambulance alert if any direction detects ambulance
  useEffect(() => {
    if (trafficData.some(t => t.ambulanceDetected)) {
      setShowAmbulanceAlert(true);
      const timeout = setTimeout(() => setShowAmbulanceAlert(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [trafficData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Ambulance Alert Banner */}
      {showAmbulanceAlert && (
        <div className="fixed top-0 left-0 w-full z-50 flex justify-center">
          <div className="bg-blue-700 text-white px-6 py-3 rounded-b-lg flex items-center space-x-3 shadow-lg animate-pulse">
            <Siren className="w-6 h-6 text-white animate-pulse" />
            <span className="font-bold">Ambulance Detected! Giving Priority...</span>
          </div>
        </div>
      )}

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
        {/* Live Video Stream */}
        <div className="mb-8 flex justify-center">
          <img
            src="http://localhost:5001/video_feed"
            alt="Live Feed"
            className="rounded-lg border-4 border-blue-700 w-[480px] h-[270px] object-contain"
          />
        </div>
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
                    {traffic.annotatedVideoUrl && (
                      <div className="mt-2 flex items-center space-x-2">
                        <a
                          href={`http://localhost:5001${traffic.annotatedVideoUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline text-xs flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" /> Download Annotated Video
                        </a>
                        {/* Download log button, assuming backend exposes /logs/<filename> */}
                        <a
                          href={`http://localhost:5001/logs/${traffic.direction}_log.txt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 underline text-xs flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" /> Download Log
                        </a>
                      </div>
                    )}
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
                {/* --- Detector stats from backend --- */}
                <div className="pt-4 border-t border-gray-700 mt-2">
                  {statsLoading && <span className="text-gray-400 text-xs">Loading detector status...</span>}
                  {detectorStats && (
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>
                        <span className="font-semibold">Model:</span> {detectorStats.model_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">Device:</span> {detectorStats.device || 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">Uptime:</span> {detectorStats.uptime_seconds ? `${Math.floor(detectorStats.uptime_seconds/60)} min` : 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">Confidence:</span> {detectorStats.confidence_threshold}
                      </div>
                      <div>
                        <span className="font-semibold">NMS:</span> {detectorStats.nms_threshold}
                      </div>
                    </div>
                  )}
                  {!statsLoading && !detectorStats && (
                    <span className="text-red-400 text-xs">Unable to fetch detector status</span>
                  )}
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

        {/* Video upload and analysis UI */}
        <div className="max-w-2xl mx-auto my-8 bg-gray-800/70 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Intersection Video Analysis</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {['north', 'south', 'east', 'west'].map(dir => (
              <div key={dir} className="flex flex-col">
                <label className="text-gray-300 mb-1 capitalize">{dir} video</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => handleFileChange(dir, e.target.files?.[0] || null)}
                  className="bg-gray-700 text-white rounded px-2 py-1"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || Object.values(videoFiles).some(f => !f)}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              loading || Object.values(videoFiles).some(f => !f)
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Analyzing...' : 'Analyze Intersection'}
          </button>
          {error && <div className="mt-3 text-red-400">{error}</div>}
        </div>

        {/* Display analysis result */}
        {analysisResult && (
          <div className="max-w-3xl mx-auto my-8 bg-gray-900/80 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-2">Analysis Result</h3>
            <div className="text-gray-300 mb-2">
              <span className="font-semibold">Emergency Override:</span>{' '}
              <span className={analysisResult.emergency_override ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                {analysisResult.emergency_override ? 'YES' : 'NO'}
              </span>
            </div>
            {analysisResult.priority_direction && (
              <div className="text-gray-300 mb-2">
                <span className="font-semibold">Priority Direction:</span>{' '}
                <span className="text-yellow-400 font-bold">{analysisResult.priority_direction.toUpperCase()}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {Object.entries(analysisResult.results).map(([dir, res]: any) => (
                <div key={dir} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-white font-bold capitalize mb-2">{dir}</div>
                  <div className="text-gray-300 text-sm">
                    Ambulance Detected: <span className={res.ambulance_detected ? 'text-blue-400 font-bold' : 'text-gray-400'}>{res.ambulance_detected ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    Ambulance Count: <span className="font-bold">{res.ambulance_count}</span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    Frames Analyzed: <span className="font-bold">{res.frames_analyzed}</span>
                  </div>
                  {res.detection_frames && res.detection_frames.length > 0 && (
                    <div className="text-gray-300 text-xs mt-2">
                      <span className="font-semibold">Detection Frames:</span>
                      <ul className="list-disc ml-6">
                        {res.detection_frames.map((f: any) => (
                          <li key={f.frame_number}>
                            Frame {f.frame_number}: {f.ambulance_count} ambulance(s)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// fetch('http://<backend-ip>:8000/api/analyze/intersection', { ... })
export default TrafficSimulation;

// Example: POST video for analysis