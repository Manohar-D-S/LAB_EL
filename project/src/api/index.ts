// Remove any unrelated or old API code and replace with only the APIs from integration_summary.md

// ...remove all unrelated/old code...

// Add only the APIs from integration_summary.md

const API_BASE = 'http://localhost:5001'; // Or 8000 if that's your backend port

export const detectImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/detect/image`, {
    method: 'POST',
    body: formData,
    credentials: 'omit'
  });
  if (!res.ok) throw new Error('Image detection failed');
  return res.json();
};

export const detectVideo = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/detect/video`, {
    method: 'POST',
    body: formData,
    credentials: 'omit'
  });
  if (!res.ok) throw new Error('Video detection failed');
  return res.json();
};

export const analyzeIntersection = async (
  videos: { north: File; south: File; east: File; west: File },
  intersectionId: string
) => {
  const formData = new FormData();
  formData.append('video_north', videos.north);
  formData.append('video_south', videos.south);
  formData.append('video_east', videos.east);
  formData.append('video_west', videos.west);
  formData.append('intersection_id', intersectionId);
  const res = await fetch(`${API_BASE}/api/analyze/intersection`, {
    method: 'POST',
    body: formData,
    credentials: 'omit'
  });
  if (!res.ok) throw new Error('Intersection analysis failed');
  return res.json();
};

export const signalControl = async (data: { analysis_id: string; priority_direction: string; emergency_override: boolean }) => {
  const res = await fetch(`${API_BASE}/api/signal-control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'omit'
  });
  if (!res.ok) throw new Error('Signal control failed');
  return res.json();
};

export const getDetectorStats = async () => {
  const res = await fetch(`${API_BASE}/api/detector/stats`);
  if (!res.ok) throw new Error('Detector stats fetch failed');
  return res.json();
};

export const getApiHealth = async () => {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('API health check failed');
  return res.json();
};

export const updateDetectorSettings = async (settings: { confidence?: number; nms?: number }) => {
  const res = await fetch(`${API_BASE}/api/detector/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
    credentials: 'omit'
  });
  if (!res.ok) throw new Error('Update settings failed');
  return res.json();
};

// ...no other APIs should be present...
