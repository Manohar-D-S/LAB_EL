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
  const [speed, setSpeed] = useState(1); // Default speed is 1x, can go up to 4x

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

  const actualDistanceCovered = (() => {
    if (!route?.path || route.path.length < 2) return 0;
    const index = Math.min(
      Math.floor((sliderValue / 100) * (route.path.length - 1)),
      pathDistancesRef.current.length - 1
    );
    return pathDistancesRef.current[index] || 0;
  })();

  const percentCovered = totalDistanceRef.current
    ? (actualDistanceCovered / totalDistanceRef.current) * 100
    : 0;

  console.log({
    sliderValue,
    actualDistanceCovered,
    percentCovered,
    totalDistance: totalDistanceRef.current
  });

  return (
    <div
      className="fixed bottom-6 left-6 z-30"
      style={{ minWidth: 420, maxWidth: 600, width: '38vw', pointerEvents: 'auto' }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-xl text-gray-800">Route Simulation</h3>
            <p className="text-sm text-gray-500">
              {isStarted ? (
                <span className="text-green-600 font-semibold animate-pulse">Active</span>
              ) : (
                'Ready'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-2">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${percentCovered}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{percentCovered.toFixed(1)}% Distance Covered</span>
              <span>
                {(actualDistanceCovered / 1000).toFixed(2)} km / {(totalDistanceRef.current / 1000).toFixed(2)} km
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Speed</span>
              <button
                type="button"
                className={`px-4 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                  'bg-blue-600 text-white border-blue-700 shadow hover:bg-blue-700'
                }`}
                onClick={() => setSpeed(s => (s < 4 ? s + 1 : 1))}
              >
                {speed}
              </button>
            </div>
            <button
              onClick={() => {
                if (!isStarted) {
                  handleStartClick();
                } else {
                  // Stop simulation and reset everything
                  setIsStarted(false);
                  if (onSimulationStart) onSimulationStart(false);
                  if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                    lastTimestampRef.current = null;
                  }
                  setSliderValue(0);
                  sliderValueRef.current = 0;
                  if (route?.path && route.path.length > 0) {
                    onSliderChange(route.path[0]);
                  }
                }
              }}
              className={`ml-auto px-6 py-2 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${
                isStarted
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isStarted ? 'Finish' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteDetails;