// API endpoints for YOLOv8 model integration
// This file defines the structure and types for connecting with your YOLOv8 model

export interface VideoUploadRequest {
  videos: File[];
  intersectionId: string;
  cameraAngles: ('north' | 'south' | 'east' | 'west')[];
}

export interface DetectionResponse {
  camera_id: 'north' | 'south' | 'east' | 'west';
  timestamp: string;
  detections: {
    vehicles: number;
    pedestrians: number;
    congestion_level: number; // 0-1 scale
    avg_speed: number; // km/h
    queue_length: number;
    vehicle_types: {
      cars: number;
      trucks: number;
      buses: number;
      motorcycles: number;
    };
    bounding_boxes: Array<{
      class: string;
      confidence: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
}

export interface SignalControlRequest {
  timestamp: string;
  intersectionId: string;
  cameraData: Array<{
    camera_id: 'north' | 'south' | 'east' | 'west';
    vehicles: number;
    pedestrians: number;
    congestion_level: number;
    avg_speed: number;
    queue_length: number;
    wait_time: number;
  }>;
  recommendedTiming?: {
    northSouth: number;
    eastWest: number;
  };
}

export interface SignalControlResponse {
  success: boolean;
  timing: {
    northSouth: number;
    eastWest: number;
    yellowDuration: number;
  };
  message: string;
}

// API endpoint functions
export class TrafficAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // Upload videos for analysis
  async uploadVideos(request: VideoUploadRequest): Promise<{ analysisId: string }> {
    const formData = new FormData();
    request.videos.forEach((video, index) => {
      formData.append(`video_${index}`, video);
      formData.append(`camera_angle_${index}`, request.cameraAngles[index]);
    });
    formData.append('intersection_id', request.intersectionId);

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get real-time detection data
  async getDetectionData(cameraId: string): Promise<DetectionResponse> {
    const response = await fetch(`${this.baseUrl}/detection/${cameraId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Detection fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Send signal control commands
  async sendSignalControl(request: SignalControlRequest): Promise<SignalControlResponse> {
    const response = await fetch(`${this.baseUrl}/signal-control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Signal control failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get system status
  async getSystemStatus(): Promise<{
    modelStatus: 'active' | 'inactive' | 'error';
    connectedCameras: string[];
    lastUpdate: string;
    performance: {
      accuracy: number;
      processingSpeed: number;
      confidence: number;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Status fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Start real-time analysis
  async startAnalysis(analysisId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/analysis/${analysisId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Analysis start failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Stop analysis
  async stopAnalysis(analysisId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/analysis/${analysisId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Analysis stop failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// WebSocket connection for real-time updates
export class TrafficWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onDetectionUpdate?: (data: DetectionResponse) => void;
  private onSignalUpdate?: (data: any) => void;

  constructor(url: string = 'ws://localhost:8000/ws') {
    this.url = url;
  }

  connect(
    onDetectionUpdate?: (data: DetectionResponse) => void,
    onSignalUpdate?: (data: any) => void
  ): void {
    this.onDetectionUpdate = onDetectionUpdate;
    this.onSignalUpdate = onSignalUpdate;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected to YOLOv8 model');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'detection' && this.onDetectionUpdate) {
          this.onDetectionUpdate(data.payload);
        } else if (data.type === 'signal' && this.onSignalUpdate) {
          this.onSignalUpdate(data.payload);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(this.onDetectionUpdate, this.onSignalUpdate), 5000);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

// Example usage:
/*
const api = new TrafficAPI();
const ws = new TrafficWebSocket();

// Upload videos
const uploadRequest: VideoUploadRequest = {
  videos: [file1, file2, file3, file4],
  intersectionId: 'main-intersection-01',
  cameraAngles: ['north', 'south', 'east', 'west']
};

api.uploadVideos(uploadRequest)
  .then(result => {
    console.log('Analysis ID:', result.analysisId);
    return api.startAnalysis(result.analysisId);
  })
  .then(() => {
    // Connect WebSocket for real-time updates
    ws.connect(
      (detectionData) => {
        console.log('Detection update:', detectionData);
      },
      (signalData) => {
        console.log('Signal update:', signalData);
      }
    );
  });
*/