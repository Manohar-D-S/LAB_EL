import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, BarChart3, Car, Truck, Users, AlertCircle, Activity, Clock, TrendingUp } from 'lucide-react';

interface DetectionData {
  id: string;
  cameraAngle: 'north' | 'south' | 'east' | 'west';
  vehicles: number;
  pedestrians: number;
  congestion: 'low' | 'medium' | 'high';
  congestionLevel: number; // 0-1 scale
  waitTime: number;
  avgSpeed: number;
  queueLength: number;
  timestamp: string;
}

interface UploadedVideo {
  id: string;
  file: File;
  name: string;
  size: string;
  preview: string;
  cameraAngle: 'north' | 'south' | 'east' | 'west';
}

const VideoAnalysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videos: UploadedVideo[] = location.state?.videos || [];
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionData, setDetectionData] = useState<DetectionData[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isConnectedToModel, setIsConnectedToModel] = useState(false);

  // Congestion level calculation logic
  const calculateCongestionLevel = (vehicles: number, queueLength: number, avgSpeed: number): { level: 'low' | 'medium' | 'high', score: number } => {
    // Normalize factors (0-1 scale)
    const vehicleFactor = Math.min(vehicles / 20, 1); // Max 20 vehicles = 1.0
    const queueFactor = Math.min(queueLength / 15, 1); // Max 15 queue length = 1.0
    const speedFactor = Math.max(0, (60 - avgSpeed) / 60); // Lower speed = higher congestion
    
    // Weighted average (vehicles: 40%, queue: 35%, speed: 25%)
    const congestionScore = (vehicleFactor * 0.4) + (queueFactor * 0.35) + (speedFactor * 0.25);
    
    let level: 'low' | 'medium' | 'high';
    if (congestionScore <= 0.3) level = 'low';
    else if (congestionScore <= 0.7) level = 'medium';
    else level = 'high';
    
    return { level, score: congestionScore };
  };

  // Mock YOLOv8 detection simulation with realistic data
  useEffect(() => {
    if (videos.length > 0) {
      setIsAnalyzing(true);
      
      // Simulate connection to YOLOv8 model
      setTimeout(() => setIsConnectedToModel(true), 1000);
      
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAnalyzing(false);
            return 100;
          }
          return prev + 1.5;
        });
      }, 100);

      // Simulate real-time detection data updates
      const detectionInterval = setInterval(() => {
        const newData = videos.map((video) => {
          const baseVehicles = Math.floor(Math.random() * 15) + 3;
          const basePedestrians = Math.floor(Math.random() * 6) + 1;
          const baseSpeed = Math.random() * 40 + 20; // 20-60 km/h
          const baseQueue = Math.floor(Math.random() * 12) + 2;
          
          // Add some correlation between factors for realism
          const timeOfDay = new Date().getHours();
          const rushHourMultiplier = (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19) ? 1.5 : 1;
          
          const vehicles = Math.floor(baseVehicles * rushHourMultiplier);
          const queueLength = Math.floor(baseQueue * rushHourMultiplier);
          const avgSpeed = Math.max(10, baseSpeed / rushHourMultiplier);
          
          const congestionData = calculateCongestionLevel(vehicles, queueLength, avgSpeed);
          
          return {
            id: video.id,
            cameraAngle: video.cameraAngle,
            vehicles,
            pedestrians: basePedestrians,
            congestion: congestionData.level,
            congestionLevel: congestionData.score,
            waitTime: Math.floor((congestionData.score * 90) + 15), // 15-105 seconds
            avgSpeed: Math.round(avgSpeed * 10) / 10,
            queueLength,
            timestamp: new Date().toISOString()
          };
        });
        setDetectionData(newData);
      }, 2000);

      return () => {
        clearInterval(interval);
        clearInterval(detectionInterval);
      };
    }
  }, [videos]);

  // API simulation for YOLOv8 integration
  const sendToSignalControl = async (detectionData: DetectionData[]) => {
    try {
      // Simulate API call to signal control system
      const response = await fetch('/api/signal-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          intersectionId: 'main-intersection-01',
          cameraData: detectionData.map(data => ({
            camera_id: data.cameraAngle,
            vehicles: data.vehicles,
            pedestrians: data.pedestrians,
            congestion_level: data.congestionLevel,
            avg_speed: data.avgSpeed,
            queue_length: data.queueLength,
            wait_time: data.waitTime
          }))
        })
      });
      
      console.log('Signal control data sent:', response.status);
    } catch (error) {
      console.log('Signal control API simulation:', error);
    }
  };

  // Send data to signal control when detection data updates
  useEffect(() => {
    if (detectionData.length > 0) {
      sendToSignalControl(detectionData);
    }
  }, [detectionData]);

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getCongestionBg = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/20 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getCameraAngleLabel = (angle: string) => {
    return `${angle.charAt(0).toUpperCase() + angle.slice(1)} Lane`;
  };

  if (videos.length === 0) {
    navigate('/');
    return null;
  }

  const totalVehicles = detectionData.reduce((sum, d) => sum + d.vehicles, 0);
  const totalPedestrians = detectionData.reduce((sum, d) => sum + d.pedestrians, 0);
  const avgWaitTime = detectionData.length > 0 
    ? Math.round(detectionData.reduce((sum, d) => sum + d.waitTime, 0) / detectionData.length)
    : 0;
  const highCongestionLanes = detectionData.filter(d => d.congestion === 'high').length;
  const avgCongestionLevel = detectionData.length > 0
    ? detectionData.reduce((sum, d) => sum + d.congestionLevel, 0) / detectionData.length
    : 0;

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
                <h1 className="text-2xl font-bold text-white">Multi-Camera Traffic Analysis</h1>
                <p className="text-gray-400">Real-time YOLOv8 detection and traffic monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg border ${
                isConnectedToModel 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-yellow-500/20 border-yellow-500/30'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnectedToModel ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
                  }`}></div>
                  <span className={`font-medium ${
                    isConnectedToModel ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    {isConnectedToModel ? 'YOLOv8 Connected' : 'Connecting...'}
                  </span>
                </div>
              </div>
              <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <span className="text-blue-500 font-medium">
                  {isAnalyzing ? `Analyzing... ${analysisProgress.toFixed(0)}%` : 'Analysis Active'}
                </span>
              </div>
              <button
                onClick={() => navigate('/simulation')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                View Simulation
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">YOLOv8 Analysis Progress</h2>
              <span className="text-blue-500 font-medium">{analysisProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
            <div className="mt-3 text-sm text-gray-400">
              Processing video feeds and detecting objects in real-time...
            </div>
          </div>
        )}

        {/* Real-time Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Vehicles</p>
                <p className="text-white text-xl font-bold">{totalVehicles}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pedestrians</p>
                <p className="text-white text-xl font-bold">{totalPedestrians}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Wait Time</p>
                <p className="text-white text-xl font-bold">{avgWaitTime}s</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">High Congestion</p>
                <p className="text-white text-xl font-bold">{highCongestionLanes} lanes</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Congestion Level</p>
                <p className="text-white text-xl font-bold">{(avgCongestionLevel * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid with Real-time Detection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {videos.map((video) => {
            const detection = detectionData.find(d => d.id === video.id);
            
            return (
              <div key={video.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-700/50 px-4 py-3 border-b border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">{getCameraAngleLabel(video.cameraAngle)}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-500 text-sm">Live Detection</span>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <video
                    src={video.preview}
                    className="w-full h-64 object-cover"
                    controls
                    muted
                    loop
                    autoPlay
                  />
                  
                  {/* Detection Overlay */}
                  {detection && (
                    <div className="absolute top-4 left-4 space-y-2">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Car className="w-4 h-4 text-blue-500" />
                          <span className="text-white text-sm font-medium">{detection.vehicles} vehicles</span>
                        </div>
                      </div>
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-green-500" />
                          <span className="text-white text-sm font-medium">{detection.pedestrians} pedestrians</span>
                        </div>
                      </div>
                      <div className={`${getCongestionBg(detection.congestion)} backdrop-blur-sm rounded-lg px-3 py-2 border`}>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className={`w-4 h-4 ${getCongestionColor(detection.congestion)}`} />
                          <span className={`text-sm ${getCongestionColor(detection.congestion)} font-medium`}>
                            {detection.congestion.toUpperCase()} ({(detection.congestionLevel * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional metrics overlay */}
                  {detection && (
                    <div className="absolute top-4 right-4 space-y-2">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
                        <div className="text-white text-xs">
                          <div>Speed: {detection.avgSpeed} km/h</div>
                          <div>Queue: {detection.queueLength}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Detailed Detection Stats */}
                {detection && (
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-400 text-xs">Wait Time</p>
                        <p className="text-white font-semibold">{detection.waitTime}s</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Avg Speed</p>
                        <p className="text-white font-semibold">{detection.avgSpeed} km/h</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Queue Length</p>
                        <p className="text-white font-semibold">{detection.queueLength}</p>
                      </div>
                    </div>
                    
                    {/* Congestion Level Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Congestion Level</span>
                        <span className={getCongestionColor(detection.congestion)}>
                          {(detection.congestionLevel * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            detection.congestion === 'low' ? 'bg-green-500' :
                            detection.congestion === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${detection.congestionLevel * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Congestion Analysis Explanation */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Congestion Level Calculation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Vehicle Density (40%)</h3>
              <p className="text-gray-400 text-sm">
                Number of vehicles detected in the lane. Higher vehicle count increases congestion score.
              </p>
              <div className="mt-2 text-xs text-blue-500">Max threshold: 20 vehicles</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Queue Length (35%)</h3>
              <p className="text-gray-400 text-sm">
                Length of vehicle queue waiting at the signal. Longer queues indicate higher congestion.
              </p>
              <div className="mt-2 text-xs text-green-500">Max threshold: 15 vehicles</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Average Speed (25%)</h3>
              <p className="text-gray-400 text-sm">
                Average speed of vehicles. Lower speeds indicate traffic congestion and delays.
              </p>
              <div className="mt-2 text-xs text-yellow-500">Optimal speed: 60 km/h</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
            <h4 className="text-white font-medium mb-2">Congestion Levels:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-500">Low (0-30%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-500">Medium (31-70%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-500">High (71-100%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Integration Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">YOLOv8 Model Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Active Endpoints</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 font-mono text-sm">POST /api/analyze</span>
                  <span className="text-gray-400 text-sm">- Video upload & processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 font-mono text-sm">GET /api/detection/:camera</span>
                  <span className="text-gray-400 text-sm">- Real-time detection data</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 font-mono text-sm">POST /api/signal-control</span>
                  <span className="text-gray-400 text-sm">- Signal timing commands</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Detection Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Detection Accuracy</span>
                  <span className="text-green-500 font-semibold">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Processing Speed</span>
                  <span className="text-blue-500 font-semibold">30 FPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Model Confidence</span>
                  <span className="text-purple-500 font-semibold">87.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Data Transmission</span>
                  <span className="text-green-500 font-semibold">Real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalysis;