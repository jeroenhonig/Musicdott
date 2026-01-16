import { ReactNode, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useLocation } from 'wouter';

// Define the navigation structure/hierarchy
const NAVIGATION_ROUTES = [
  '/',
  '/students',
  '/songs',
  '/lessons',
  '/schedule',
  '/real-time'
];

interface GestureNavigationProps {
  children: ReactNode;
}

export default function GestureNavigation({ children }: GestureNavigationProps) {
  const [location, navigate] = useLocation();
  const [swipeIndicator, setSwipeIndicator] = useState<'left' | 'right' | null>(null);
  const [startX, setStartX] = useState<number | null>(null);

  // Find the current index in our route array
  const currentIndex = NAVIGATION_ROUTES.indexOf(location);
  
  const handlers = useSwipeable({
    onSwipeStart: (eventData) => {
      setStartX(eventData.initial[0]);
    },
    onSwiping: (eventData) => {
      // Only show indicators for horizontal swipes
      if (Math.abs(eventData.deltaX) > Math.abs(eventData.deltaY) && Math.abs(eventData.deltaX) > 50) {
        if (eventData.deltaX > 0) {
          setSwipeIndicator('right');
        } else {
          setSwipeIndicator('left');
        }
      } else {
        setSwipeIndicator(null);
      }
    },
    onSwiped: (eventData) => {
      // Determine if we can navigate based on the current index
      if (Math.abs(eventData.deltaX) > 100) { // Only trigger if sufficient swipe distance
        if (eventData.dir === 'Right' && currentIndex > 0) {
          // Navigate back
          navigate(NAVIGATION_ROUTES[currentIndex - 1]);
        } else if (eventData.dir === 'Left' && currentIndex < NAVIGATION_ROUTES.length - 1) {
          // Navigate forward
          navigate(NAVIGATION_ROUTES[currentIndex + 1]);
        }
      }
      
      // Reset the indicator
      setSwipeIndicator(null);
      setStartX(null);
    },
    preventScrollOnSwipe: false,
    trackMouse: false, // Only track touch events, not mouse
    trackTouch: true,
    delta: 10, // Minimum delta before triggering swipe
    swipeDuration: 500, // Maximum time in ms to consider as a swipe
  });

  // Add a class to indicate swipe direction
  let indicatorClass = '';
  if (swipeIndicator === 'left') {
    indicatorClass = 'swiping-left';
  } else if (swipeIndicator === 'right') {
    indicatorClass = 'swiping-right';
  }

  return (
    <div 
      {...handlers} 
      className={`gesture-container h-full w-full ${indicatorClass}`}
    >
      {/* Visual indicators for swipe direction */}
      {swipeIndicator === 'left' && (
        <div className="swipe-indicator swipe-indicator-left">
          <span>→</span>
        </div>
      )}
      {swipeIndicator === 'right' && (
        <div className="swipe-indicator swipe-indicator-right">
          <span>←</span>
        </div>
      )}
      
      {children}
      
      {/* We'll use regular CSS classes instead of styled-jsx */}
    </div>
  );
}