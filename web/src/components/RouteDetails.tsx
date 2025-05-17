import React, { useState, useEffect } from 'react';

interface RouteDetailsProps {
  route?: {
    distance: number;
    path: { lat: number; lng: number }[];
  } | null; // Allow null or undefined
  onSliderChange: (position: { lat: number; lng: number }) => void;
}

const RouteDetails: React.FC<RouteDetailsProps> = ({ route, onSliderChange }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const handleStartClick = () => {
    if (!route) {
      alert('Please select a route first!');
      return;
    }

    if (isStarted) {
      setIsStarted(false);
      setSliderValue(100);
      onSliderChange(route.path[route.path.length - 1]);
    } else {
      setIsStarted(true);
      setSliderValue(0);
      onSliderChange(route.path[0]);
    }
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!route) return;

    const value = parseInt(event.target.value, 10);
    setSliderValue(value);

    const index = Math.floor((value / 100) * (route.path.length - 1));
    onSliderChange(route.path[index]);
  };

  return (
    <div className="bg-white shadow-sm border-t border-slate-200 p-4 flex items-center justify-between">
      {/* Slider */}
      <div className="flex-1 mr-4">
        <input
          type="range"
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          min="0"
          max="100"
          value={sliderValue}
          onChange={handleSliderChange}
          aria-label="Distance covered slider"
          disabled={!isStarted || !route}
        />
        <div className="text-sm text-slate-600 mt-1 text-center">
          {sliderValue}% Distance Covered
        </div>
      </div>

      {/* Start/Finish Button */}
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
  );
};

export default RouteDetails;