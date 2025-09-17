import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Slider, 
  Box, 
  Typography, 
  IconButton, 
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Speed,
  Timeline
} from '@mui/icons-material';
import { format, subHours, subDays, subWeeks } from 'date-fns';
import { useDashboardStore } from '@/store/dashboardStore';

interface TimeSliderProps {
  className?: string;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ className }) => {
  const {
    selectedTimeRange,
    animationSpeed,
    setSelectedTimeRange,
    setAnimationSpeed
  } = useDashboardStore();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(selectedTimeRange.end);
  const [timeRange, setTimeRange] = useState('24h');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Time range options
  const timeRangeOptions = [
    { value: '1h', label: '1 Hour', hours: 1 },
    { value: '6h', label: '6 Hours', hours: 6 },
    { value: '24h', label: '24 Hours', hours: 24 },
    { value: '7d', label: '7 Days', hours: 24 * 7 },
    { value: '30d', label: '30 Days', hours: 24 * 30 }
  ];
  
  // Playback speed options
  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
    { value: 8, label: '8x' }
  ];
  
  // Calculate time bounds based on selected range
  const getTimeBounds = useCallback(() => {
    const now = new Date();
    const option = timeRangeOptions.find(opt => opt.value === timeRange);
    const hours = option?.hours || 24;
    
    return {
      start: subHours(now, hours),
      end: now
    };
  }, [timeRange]);
  
  // Update time range when selection changes
  useEffect(() => {
    const bounds = getTimeBounds();
    setSelectedTimeRange(bounds.start, bounds.end);
    setCurrentTime(bounds.end);
  }, [timeRange, setSelectedTimeRange, getTimeBounds]);
  
  // Animation loop for playback
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime(prev => {
          const bounds = getTimeBounds();
          const newTime = new Date(prev.getTime() - (60000 * playbackSpeed)); // Move backward in time
          
          if (newTime < bounds.start) {
            return bounds.end; // Loop back to end
          }
          
          return newTime;
        });
      }, 100); // Update every 100ms for smooth animation
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, playbackSpeed, getTimeBounds]);
  
  // Update animation speed in store
  useEffect(() => {
    setAnimationSpeed(playbackSpeed);
  }, [playbackSpeed, setAnimationSpeed]);
  
  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };
  
  const handleSpeedChange = (event: SelectChangeEvent) => {
    setPlaybackSpeed(Number(event.target.value));
  };
  
  const handleSliderChange = (_: Event, value: number | number[]) => {
    const bounds = getTimeBounds();
    const timeValue = Array.isArray(value) ? value[0] : value;
    const newTime = new Date(bounds.start.getTime() + (timeValue / 100) * (bounds.end.getTime() - bounds.start.getTime()));
    setCurrentTime(newTime);
  };
  
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  const stepBackward = () => {
    setCurrentTime(prev => {
      const bounds = getTimeBounds();
      const newTime = new Date(prev.getTime() - 60000 * 10); // Step back 10 minutes
      return newTime < bounds.start ? bounds.start : newTime;
    });
  };
  
  const stepForward = () => {
    setCurrentTime(prev => {
      const bounds = getTimeBounds();
      const newTime = new Date(prev.getTime() + 60000 * 10); // Step forward 10 minutes
      return newTime > bounds.end ? bounds.end : newTime;
    });
  };
  
  const getSliderValue = () => {
    const bounds = getTimeBounds();
    const totalDuration = bounds.end.getTime() - bounds.start.getTime();
    const currentPosition = currentTime.getTime() - bounds.start.getTime();
    return (currentPosition / totalDuration) * 100;
  };
  
  return (
    <motion.div
      className={className}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          padding: 2,
          color: 'white',
          minWidth: 600
        }}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Timeline />
            <Typography variant="h6">Temporal Analysis</Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={timeRange}
                onChange={handleTimeRangeChange}
                sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
              >
                {timeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Speed />
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={playbackSpeed.toString()}
                  onChange={handleSpeedChange}
                  sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
                >
                  {speedOptions.map(option => (
                    <MenuItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
        
        {/* Current time display */}
        <Box textAlign="center" mb={2}>
          <Typography variant="h5" component="div">
            {format(currentTime, 'MMM dd, yyyy HH:mm:ss')}
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            {format(currentTime, 'EEEE')}
          </Typography>
        </Box>
        
        {/* Time slider */}
        <Box mb={2}>
          <Slider
            value={getSliderValue()}
            onChange={handleSliderChange}
            min={0}
            max={100}
            step={0.1}
            sx={{
              color: '#00ff88',
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
                '&:hover': {
                  boxShadow: '0 0 0 8px rgba(0, 255, 136, 0.16)'
                }
              },
              '& .MuiSlider-track': {
                height: 4
              },
              '& .MuiSlider-rail': {
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          />
          
          {/* Time markers */}
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              {format(getTimeBounds().start, 'HH:mm')}
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              {format(getTimeBounds().end, 'HH:mm')}
            </Typography>
          </Box>
        </Box>
        
        {/* Playback controls */}
        <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
          <Tooltip title="Step Backward">
            <IconButton onClick={stepBackward} sx={{ color: 'white' }}>
              <SkipPrevious />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
            <IconButton
              onClick={togglePlayback}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(0, 255, 136, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 255, 136, 0.3)'
                }
              }}
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Pause />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <PlayArrow />
                  </motion.div>
                )}
              </AnimatePresence>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Step Forward">
            <IconButton onClick={stepForward} sx={{ color: 'white' }}>
              <SkipNext />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </motion.div>
  );
};

export default TimeSlider;