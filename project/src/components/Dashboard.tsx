import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Play, Settings, BarChart3, Camera, ArrowRight, CheckCircle, X, Video } from 'lucide-react';

interface UploadedVideo {
  id: string;
  file: File | null;
  name: string;
  size: string;
  preview: string;
  cameraAngle: 'north' | 'south' | 'east' | 'west';
}

const cameraAngles = ['north', 'south', 'east', 'west'] as const;
const maxVideos = cameraAngles.length;

const Dashboard = () => {
  const navigate = useNavigate();
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [yoloResult, setYoloResult] = useState<any>(null);
  const [shouldCache, setShouldCache] = useState(false);
  const [mode, setMode] = useState<'none' | 'upload' | 'live'>('none');

  // Only load cache when switching to upload mode
  const loadCache = () => {
    const cached = localStorage.getItem('uploadedVideos');
    const cachedAnalysis = localStorage.getItem('analysisComplete');
    const cachedYolo = localStorage.getItem('yoloResult');
    if (cached) {
      const parsed: UploadedVideo[] = JSON.parse(cached);
      setUploadedVideos(parsed);
      setIsUploadComplete(parsed.length === maxVideos && parsed.every(v => v.file));
      if (cachedAnalysis === 'true' && cachedYolo) {
        setAnalysisComplete(true);
        setShouldCache(true);
        setYoloResult(JSON.parse(cachedYolo));
      }
    } else {
      setUploadedVideos([]);
      setIsUploadComplete(false);
      setAnalysisComplete(false);
      setShouldCache(false);
      setYoloResult(null);
    }
  };

  // When switching to upload mode, load cache
  useEffect(() => {
    if (mode === 'upload') {
      loadCache();
    }
    // eslint-disable-next-line
  }, [mode]);

  // Cache videos and analysis state in localStorage only if analysis is complete
  useEffect(() => {
    if (shouldCache && analysisComplete) {
      localStorage.setItem('uploadedVideos', JSON.stringify(uploadedVideos));
      localStorage.setItem('analysisComplete', 'true');
      if (yoloResult) localStorage.setItem('yoloResult', JSON.stringify(yoloResult));
    }
    setIsUploadComplete(uploadedVideos.length === maxVideos && uploadedVideos.every(v => v.file));
  }, [uploadedVideos, analysisComplete, shouldCache, yoloResult]);

  // Remove cache if not analysed or videos are removed
  useEffect(() => {
    if (!analysisComplete || uploadedVideos.length !== maxVideos) {
      localStorage.removeItem('uploadedVideos');
      localStorage.removeItem('analysisComplete');
      localStorage.removeItem('yoloResult');
      setShouldCache(false);
      setYoloResult(null);
    }
  }, [analysisComplete, uploadedVideos]);

  // Handle file upload for a specific direction
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, angle: typeof cameraAngles[number]) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Remove previous video for this angle if exists
    setUploadedVideos(prev => {
      const filtered = prev.filter(v => v.cameraAngle !== angle);
      const video: UploadedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        preview: URL.createObjectURL(file),
        cameraAngle: angle
      };
      return [...filtered, video];
    });
    // Reset input value so same file can be re-uploaded if needed
    e.target.value = '';
  };

  // Remove video for a direction
  const removeVideo = (angle: typeof cameraAngles[number]) => {
    setUploadedVideos(prev => prev.filter(v => v.cameraAngle !== angle));
    setAnalysisComplete(false);
    setShouldCache(false);
    setYoloResult(null);
  };

  // Reset all uploads
  const resetUpload = () => {
    setUploadedVideos([]);
    setIsUploadComplete(false);
    setAnalysisComplete(false);
    setShouldCache(false);
    setYoloResult(null);
    localStorage.removeItem('uploadedVideos');
    localStorage.removeItem('analysisComplete');
    localStorage.removeItem('yoloResult');
  };

  // Start analysis (simulate navigation with uploaded videos)
  const startAnalysis = () => {
    if (isUploadComplete) {
      navigate('/analysis', { state: { videos: uploadedVideos } });
    }
  };

  // Simulate YOLOv8 backend call (continuous analysis if videos are present and not analysing)
  useEffect(() => {
    if (
      uploadedVideos.length === maxVideos &&
      uploadedVideos.every(v => v.file) &&
      !isAnalysing &&
      !analysisComplete
    ) {
      runYoloAnalysis();
    }
    // eslint-disable-next-line
  }, [uploadedVideos]);

  // Replace runYoloAnalysis with real API call
  const runYoloAnalysis = async () => {
    setIsAnalysing(true);
    setAnalysisComplete(false);
    setYoloResult(null);
    try {
      // Prepare form data
      const formData = new FormData();
      uploadedVideos.forEach((video) => {
        if (video.file) {
          formData.append(video.cameraAngle, video.file, video.name);
        }
      });

      // Call backend API
      const response = await fetch('http://<raspberry-pi-ip>:5001/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();

      // Transform backend response to match dashboard expectations
      // (Assume: data.results is an array with direction, vehicleCount, waitTime, etc.)
      const phases = ['NS', 'EW'];
      const phaseDirections = { NS: ['north', 'south'], EW: ['east', 'west'] };
      const trafficStats = data.results.map((stat: any) => ({
        direction: stat.direction,
        vehicleCount: stat.vehicleCount,
        waitTime: stat.waitTime,
        priority: stat.priority,
        congestionLevel: stat.congestionLevel,
        avgSpeed: stat.avgSpeed,
        queueLength: stat.queueLength,
        ambulanceDetected: stat.ambulanceDetected,
        annotatedVideoUrl: stat.annotatedVideoUrl, // for download link
      }));

      setYoloResult({ phases, phaseDirections, trafficStats });
      setAnalysisComplete(true);
      setShouldCache(true);
      localStorage.setItem('yoloResult', JSON.stringify({ phases, phaseDirections, trafficStats }));
    } catch (err) {
      setAnalysisComplete(false);
      setShouldCache(false);
      setYoloResult(null);
      alert('Analysis failed. Please try again.');
    }
    setIsAnalysing(false);
  };

  // View simulation (only enabled if YOLO analysis is complete)
  const viewSimulation = () => {
    if (isUploadComplete && analysisComplete && yoloResult) {
      navigate('/simulation', {
        state: {
          yoloTrafficData: yoloResult.trafficStats,
          yoloPhases: yoloResult.phases,
          yoloPhaseDirections: yoloResult.phaseDirections
        }
      });
    }
  };

  const getCameraAngleLabel = (angle: string) => {
    return `${angle.charAt(0).toUpperCase() + angle.slice(1)} Camera`;
  };

  const getCameraAngleColor = (angle: string) => {
    const colors = {
      north: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      south: 'bg-green-500/20 text-green-500 border-green-500/30',
      east: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      west: 'bg-purple-500/20 text-purple-500 border-purple-500/30'
    };
    return colors[angle as keyof typeof colors] || 'bg-gray-500/20 text-gray-500 border-gray-500/30';
  };

  // Utility to truncate long file names
  const getShortFileName = (name: string, maxLen = 18) => {
    if (name.length <= maxLen) return name;
    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    return name.slice(0, maxLen - ext.length - 3) + '...' + ext;
  };

  // Fallback UI for missing videos
  const missingAngles = cameraAngles.filter(
    angle => !uploadedVideos.some(v => v.cameraAngle === angle)
  );

  // UI for landing selection
  if (mode === 'none') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Navbar */}
        <div className="bg-gray-800/50 flex items-center backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Traffic Signal Control System</h1>
                <p className="text-gray-400 text-sm">AI-Powered Intersection Dashboard</p>
              </div>
            </div>
            {/* <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <span className="text-blue-500 font-medium">Vite + React + Tailwind</span>
              </div>
              <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                <span className="text-green-500 font-medium">YOLOv8n Model</span>
              </div> */}
            {/* </div> */}
          </div>
        </div>
        {/* Main landing content */}
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-gray-800/70 rounded-xl shadow-lg p-10 flex flex-col items-center space-y-8">
            <h1 className="text-3xl font-bold text-white mb-2">Choose Mode</h1>
            <div className="flex space-x-8">
              <button
                onClick={() => setMode('live')}
                className="flex flex-col items-center px-8 py-6 bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-lg"
              >
                <Video className="w-12 h-12 text-white mb-2" />
                <span className="text-white font-semibold text-lg">Live Feed</span>
                <span className="text-gray-300 text-xs mt-2 text-center max-w-[120px]">
                  View real-time camera and detection
                </span>
              </button>
              <button
                onClick={() => setMode('upload')}
                className="flex flex-col items-center px-8 py-6 bg-green-700 hover:bg-green-800 rounded-xl transition-colors shadow-lg"
              >
                <Upload className="w-12 h-12 text-white mb-2" />
                <span className="text-white font-semibold text-lg">Upload Videos</span>
                <span className="text-gray-300 text-xs mt-2 text-center max-w-[120px]">
                  Analyze intersection from recorded videos
                </span>
              </button>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <BarChart3 className="w-8 h-8 text-green-400 mb-2" />
                <span className="text-white font-semibold">AI Analysis</span>
                <span className="text-gray-400 text-xs text-center mt-1">
                  YOLOv8n detects vehicles, congestion, and optimizes signals.
                </span>
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-blue-400 mb-2" />
                <span className="text-white font-semibold">Simulation</span>
                <span className="text-gray-400 text-xs text-center mt-1">
                  Adaptive signal control and live intersection simulation.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Live Feed UI (placeholder for now)
  if (mode === 'live') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center">
        <div className="bg-gray-800/70 rounded-xl shadow-lg p-8 flex flex-col items-center">
          <div className="flex items-center mb-6">
            <Video className="w-10 h-10 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Live Feed & Detection</h2>
          </div>
          {/* Live video stream from backend */}
          <div className="w-[480px] h-[270px] bg-black rounded-lg flex items-center justify-center mb-4 border-4 border-blue-700 overflow-hidden">
            <img
              src="http://<raspberry-pi-ip>:5001/video_feed"
              alt="Live Feed"
              className="w-full h-full object-contain"
              style={{ background: "#000" }}
            />
          </div>
          <div className="bg-gray-700/60 rounded-lg p-4 w-full text-center mb-4">
            <span className="text-gray-300">
              YOLOv8n detection overlays are shown in real-time. Annotated video is saved on the server.
            </span>
          </div>
          <button
            onClick={() => setMode('none')}
            className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Back to Main
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Traffic Signal Control System</h1>
                <p className="text-gray-400">AI-Powered Video Analysis Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMode('none')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back to Main
              </button>
              {uploadedVideos.length > 0 && (
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Reset Upload</span>
                </button>
              )}
              <button
                onClick={viewSimulation}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isUploadComplete && analysisComplete && yoloResult
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!(isUploadComplete && analysisComplete && yoloResult)}
              >
                <Play className="w-4 h-4" />
                <span>View Simulation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400">Uploaded Videos</p>
                <p className="text-2xl font-bold text-white">{uploadedVideos.length}/{maxVideos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400">Analysis Ready</p>
                <p className="text-2xl font-bold text-white">
                  {analysisComplete && yoloResult ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400">Model Status</p>
                <p className="text-2xl font-bold text-green-500">YOLOv8 Ready</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400">Upload Status</p>
                <p className="text-2xl font-bold text-white">{isUploadComplete ? 'Complete' : 'Pending'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Upload Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Upload Traffic Videos</h2>
          <p className="text-gray-400 mb-6">
            Upload one video for each camera angle at the intersection. All four are required for simulation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cameraAngles.map(angle => {
              const video = uploadedVideos.find(v => v.cameraAngle === angle);
              return (
                <div key={angle} className="bg-gray-700/50 rounded-lg border border-gray-600 p-4 flex flex-col items-center relative">
                  <div className={`mb-2 px-2 py-1 rounded text-xs border ${getCameraAngleColor(angle)}`}>
                    {getCameraAngleLabel(angle)}
                  </div>
                  {video ? (
                    <>
                      <video
                        src={video.preview}
                        className="w-full h-32 object-cover rounded mb-2"
                        controls={false}
                        muted
                      />
                      <div className="text-white font-medium truncate w-full text-center" title={video.name}>
                        {getShortFileName(video.name)}
                      </div>
                      <div className="text-gray-400 text-sm">{video.size}</div>
                      <button
                        onClick={() => removeVideo(angle)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                        title="Remove video"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <label
                        htmlFor={`video-upload-${angle}`}
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-500 rounded cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-gray-400 text-sm">Upload {getCameraAngleLabel(angle)}</span>
                        <input
                          id={`video-upload-${angle}`}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={e => handleFileSelect(e, angle)}
                        />
                      </label>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Fallback message for missing videos */}
          {missingAngles.length > 0 && (
            <div className="mt-6 text-center text-yellow-400 font-semibold">
              Please upload videos for: {missingAngles.map(a => getCameraAngleLabel(a)).join(', ')}
            </div>
          )}
          {/* Analyze Button aligned with upload grid */}
          <div className="flex justify-center mt-8">
            <button
              onClick={runYoloAnalysis}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 text-lg font-semibold transition-colors ${
                isUploadComplete && !isAnalysing
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!isUploadComplete || isAnalysing}
            >
              {isAnalysing ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analysing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Show analysis result stats if available */}
        {analysisComplete && yoloResult && (
          <div className="mt-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">YOLOv8 Analysis Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {yoloResult.trafficStats.map((stat: any) => (
                  <div key={stat.direction} className="bg-gray-700/50 rounded-lg border border-gray-600 p-4">
                    <div className="text-lg font-bold text-white capitalize mb-2">{stat.direction}</div>
                    <div className="text-gray-400 text-sm mb-1">Vehicles: <span className="text-white">{stat.vehicleCount}</span></div>
                    <div className="text-gray-400 text-sm mb-1">Wait Time: <span className="text-white">{stat.waitTime}s</span></div>
                    <div className="text-gray-400 text-sm mb-1">Queue: <span className="text-white">{stat.queueLength}</span></div>
                    <div className="text-gray-400 text-sm mb-1">Congestion: <span className="text-white">{(stat.congestionLevel * 100).toFixed(0)}%</span></div>
                    <div className="text-gray-400 text-sm mb-1">Avg Speed: <span className="text-white">{stat.avgSpeed} km/h</span></div>
                    <div className="text-gray-400 text-sm mb-1">Priority: <span className="text-white">{stat.priority}</span></div>
                    <div className="text-gray-400 text-sm mb-1">Ambulance: <span className="text-white">{stat.ambulanceDetected ? 'Yes' : 'No'}</span></div>
                    {stat.annotatedVideoUrl && (
                      <div className="mt-2">
                        <a
                          href={`http://<raspberry-pi-ip>:5001${stat.annotatedVideoUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline text-xs"
                        >
                          Download Annotated Video
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Integration Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">YOLOv8 Model Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">API Endpoints</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-700/50 rounded p-3">
                  <span className="text-green-500 font-mono">POST /api/analyze</span>
                  <p className="text-gray-400 mt-1">Upload videos for analysis</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <span className="text-blue-500 font-mono">GET /api/detection/:id</span>
                  <p className="text-gray-400 mt-1">Get real-time detection data</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <span className="text-purple-500 font-mono">POST /api/signal-control</span>
                  <p className="text-gray-400 mt-1">Send signal timing commands</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Expected Data Format</h3>
              <div className="bg-gray-900/50 rounded p-4 text-sm">
                <pre className="text-gray-300">
{`{
  "camera_id": "north|south|east|west",
  "timestamp": "2024-01-01T12:00:00Z",
  "detections": {
    "vehicles": 12,
    "pedestrians": 3,
    "congestion_level": 0.75,
    "avg_speed": 25.5,
    "queue_length": 8
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">1. Upload Videos</h3>
              <p className="text-gray-400">Upload traffic videos from 4 different camera angles (North, South, East, West)</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">2. AI Analysis</h3>
              <p className="text-gray-400">YOLOv8 analyzes traffic patterns, counts vehicles, and calculates congestion levels</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">3. Signal Control</h3>
              <p className="text-gray-400">Intelligent traffic signal timing based on real-time analysis and congestion data</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">4. Optimization</h3>
              <p className="text-gray-400">Continuous monitoring and adaptive signal timing for optimal traffic flow</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;