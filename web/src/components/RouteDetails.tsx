import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Route } from '../types/route';
import L from 'leaflet';

interface RouteDetailsProps {
  route?: Route | null;
  onSliderChange: (position: { lat: number; lng: number }) => void;
  onSimulationStart?: (isActive: boolean) => void;
}

const RouteDetails: React.FC<RouteDetailsProps> = ({
  route,
  onSliderChange,
  onSimulationStart
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [speed, setSpeed] = useState(1);

  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const pathDistancesRef = useRef<number[]>([]);
  const totalDistanceRef = useRef<number>(0);
  const sliderValueRef = useRef<number>(0);
  const prevRouteRef = useRef<Route | null | undefined>(null);

  useEffect(() => {
    sliderValueRef.current = sliderValue;
  }, [sliderValue]);

  useEffect(() => {
    if (route?.path && route.path.length > 1) {
      const distances: number[] = [0];
      let cumulativeDistance = 0;
      for (let i = 1; i < route.path.length; i++) {
        const prevPoint = route.path[i - 1];
        const currPoint = route.path[i];
        const segmentDistance = L.latLng(prevPoint.lat, prevPoint.lng)
          .distanceTo(L.latLng(currPoint.lat, currPoint.lng));
        cumulativeDistance += segmentDistance;
        distances.push(cumulativeDistance);
      }
      pathDistancesRef.current = distances;
      totalDistanceRef.current = cumulativeDistance;
    } else {
      pathDistancesRef.current = [];
      totalDistanceRef.current = 0;
    }
    if (route !== prevRouteRef.current) {
      setSliderValue(0);
      setIsStarted(false);
      if (onSimulationStart) onSimulationStart(false);
      prevRouteRef.current = route;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastTimestampRef.current = null;
  }, [route, onSimulationStart]);

  const getPositionAtDistancePercentage = useCallback((percentage: number): { lat: number; lng: number } => {
    if (!route?.path || route.path.length < 2 || pathDistancesRef.current.length === 0) {
      return route?.path?.[0] || { lat: 0, lng: 0 };
    }
    const targetDistance = (percentage / 100) * totalDistanceRef.current;
    let segmentIndex = 0;
    for (let i = 0; i < pathDistancesRef.current.length - 1; i++) {
      if (pathDistancesRef.current[i] <= targetDistance && pathDistancesRef.current[i + 1] >= targetDistance) {
        segmentIndex = i;
        break;
      }
    }
    if (percentage >= 100 || segmentIndex === pathDistancesRef.current.length - 1) {
      return route.path[route.path.length - 1];
    }
    const startPoint = route.path[segmentIndex];
    const endPoint = route.path[segmentIndex + 1];
    const segmentStartDistance = pathDistancesRef.current[segmentIndex];
    const segmentEndDistance = pathDistancesRef.current[segmentIndex + 1];
    const segmentLength = segmentEndDistance - segmentStartDistance;
    const segmentProgress = segmentLength === 0 ? 0 :
      (targetDistance - segmentStartDistance) / segmentLength;
    return {
      lat: startPoint.lat + (endPoint.lat - startPoint.lat) * segmentProgress,
      lng: startPoint.lng + (endPoint.lng - startPoint.lng) * segmentProgress
    };
  }, [route]);

  const animateAmbulance = useCallback((timestamp: number) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
      if (animationRef.current !== null) {
        animationRef.current = requestAnimationFrame(animateAmbulance);
      }
      return;
    }
    const elapsed = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;
    const baseSpeed = 2; // Slower simulation
    const adjustedSpeed = baseSpeed * speed;
    const progressIncrement = (elapsed / 1000) * adjustedSpeed;
    const currentValue = sliderValueRef.current;
    const nextValue = Math.min(currentValue + progressIncrement, 100);
    sliderValueRef.current = nextValue;
    setSliderValue(nextValue);
    const newPosition = getPositionAtDistancePercentage(nextValue);
    onSliderChange(newPosition);
    if (nextValue < 100 && animationRef.current !== null) {
      animationRef.current = requestAnimationFrame(animateAmbulance);
    } else {
      setIsStarted(false);
      if (onSimulationStart) onSimulationStart(false);
      animationRef.current = null;
      lastTimestampRef.current = null;
    }
  }, [speed, getPositionAtDistancePercentage, onSliderChange, onSimulationStart]);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      lastTimestampRef.current = null;
    }
    if (isStarted && route?.path) {
      lastTimestampRef.current = null;
      animationRef.current = requestAnimationFrame(animateAmbulance);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        lastTimestampRef.current = null;
      }
    };
  }, [isStarted, route, animateAmbulance]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!route?.path) return;
    const value = parseInt(event.target.value, 10);
    setSliderValue(value);
    sliderValueRef.current = value;
    const newPosition = getPositionAtDistancePercentage(value);
    onSliderChange(newPosition);
    if (isStarted) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimestampRef.current = null;
      animationRef.current = requestAnimationFrame(animateAmbulance);
    }
  };

  const handleSpeedChange = () => {
    setSpeed(s => (s < 4 ? s + 1 : 1));
  };

  const handleStartClick = () => {
    if (!route?.path) {
      alert('Please select a route first!');
      return;
    }
    if (!isStarted) {
      setSliderValue(0);
      sliderValueRef.current = 0;
      onSliderChange(route.path[0]);
      setIsStarted(true);
      if (onSimulationStart) onSimulationStart(true);
    } else {
      setIsStarted(false);
      if (onSimulationStart) onSimulationStart(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        lastTimestampRef.current = null;
      }
      setSliderValue(100);
      sliderValueRef.current = 100;
      const finalPosition = getPositionAtDistancePercentage(100);
      onSliderChange(finalPosition);
    }
  };

  if (!route) return null;

  return (
    <div className="bg-white shadow-sm border-t border-slate-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-700">
          Route Simulation
          {isStarted && <span className="ml-2 text-sm text-green-600 animate-pulse">(Active)</span>}
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">Speed:</span>
            <button
              onClick={handleSpeedChange}
              className={`px-3 py-1 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300`}
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <input
            type="range"
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            aria-label="Distance covered slider"
          />
          <div className="text-sm text-slate-600 mt-1 text-center">
            {sliderValue.toFixed(1)}% Distance Covered
          </div>
        </div>
        <button
          onClick={handleStartClick}
          className={`px-4 py-2 rounded-lg shadow transition duration-200 ${
            isStarted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          title={isStarted ? 'Finish' : 'Start'}
        >
          {isStarted ? 'Finish' : 'Start'}
        </button>
      </div>
    </div>
  );
};

export default RouteDetails;