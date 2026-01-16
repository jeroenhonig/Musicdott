import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import logo from "../assets/logo.png";

interface WelcomeAnimationProps {
  onComplete?: () => void;
}

export default function WelcomeAnimation({ onComplete }: WelcomeAnimationProps) {
  const { user } = useAuth();
  const [showAnimation, setShowAnimation] = useState(true);
  
  // Auto-hide the animation after a set time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
      if (onComplete) onComplete();
    }, 3000); // 3 seconds
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // Handle manual skip
  const handleSkip = () => {
    setShowAnimation(false);
    if (onComplete) onComplete();
  };
  
  // Don't show if no user
  if (!user) return null;
  
  // Get first name
  const firstName = user.name.split(' ')[0];
  
  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div 
          className="fixed inset-0 flex flex-col items-center justify-center z-50 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background animation with music-themed gradient */}
          <div className="absolute inset-0 bg-white dark:bg-gray-900">
            {/* Animated circle gradients */}
            <motion.div 
              className="absolute -right-40 -top-40 w-96 h-96 rounded-full bg-[#ffc800] opacity-5 blur-3xl"
              animate={{ 
                scale: [1, 1.1, 1], 
                opacity: [0.05, 0.08, 0.05] 
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "reverse"
              }}
            />
            
            <motion.div 
              className="absolute -left-40 -bottom-40 w-96 h-96 rounded-full bg-[#252e48] opacity-5 blur-3xl"
              animate={{ 
                scale: [1, 1.2, 1], 
                opacity: [0.05, 0.1, 0.05] 
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                repeatType: "reverse",
                delay: 0.5
              }}
            />
            
            {/* Subtle music note patterns */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`bg-note-${i}`}
                className="absolute h-4 w-4 opacity-20"
                initial={{ 
                  left: `${Math.random() * 100}%`, 
                  top: `${Math.random() * 100}%`,
                  opacity: 0
                }}
                animate={{ opacity: [0, 0.2, 0], y: [0, -30, -60] }}
                transition={{ 
                  duration: 3,
                  delay: i * 0.4 + 0.5, 
                  repeat: 0
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17V8L18 6V15" stroke={i % 2 === 0 ? "#252e48" : "#ffc800"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="6" cy="17" r="3" fill={i % 2 === 0 ? "#252e48" : "#ffc800"}/>
                  <circle cx="15" cy="15" r="3" fill={i % 2 === 0 ? "#252e48" : "#ffc800"}/>
                </svg>
              </motion.div>
            ))}
          </div>
          <div className="relative flex flex-col items-center max-w-md px-6 text-center">
            {/* Skip button - hidden but keeping functionality intact */}
            <button 
              className="hidden"
              onClick={handleSkip}
            >
              Skip
            </button>
            
            {/* Musical note animation */}
            <div className="relative mb-6">
              {/* Animated musical notes */}
              <motion.div 
                className="absolute -top-10 -left-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 1, 0], y: -20 }}
                transition={{ delay: 0.2, duration: 2 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17.25V8.5L18 7V15.75" stroke="#ffc800" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 20.5C7.65685 20.5 9 19.1569 9 17.5C9 15.8431 7.65685 14.5 6 14.5C4.34315 14.5 3 15.8431 3 17.5C3 19.1569 4.34315 20.5 6 20.5Z" fill="#ffc800"/>
                  <path d="M15 18.5C16.6569 18.5 18 17.1569 18 15.5C18 13.8431 16.6569 12.5 15 12.5C13.3431 12.5 12 13.8431 12 15.5C12 17.1569 13.3431 18.5 15 18.5Z" fill="#ffc800"/>
                </svg>
              </motion.div>
              
              <motion.div 
                className="absolute -top-4 -right-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 1, 0], y: -20 }}
                transition={{ delay: 0.5, duration: 2 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17.25V8.5L18 7V15.75" stroke="#252e48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 20.5C7.65685 20.5 9 19.1569 9 17.5C9 15.8431 7.65685 14.5 6 14.5C4.34315 14.5 3 15.8431 3 17.5C3 19.1569 4.34315 20.5 6 20.5Z" fill="#252e48"/>
                  <path d="M15 18.5C16.6569 18.5 18 17.1569 18 15.5C18 13.8431 16.6569 12.5 15 12.5C13.3431 12.5 12 13.8431 12 15.5C12 17.1569 13.3431 18.5 15 18.5Z" fill="#252e48"/>
                </svg>
              </motion.div>
              
              {/* Logo animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <img src={logo} alt="MusicDott Logo" className="h-16" />
              </motion.div>
            </div>
            
            {/* Welcome text animation with staggered letters */}
            <div className="relative">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h1 className="text-3xl font-bold mb-2 text-[#252e48]">
                  {/* Animate each character in "Welcome back" */}
                  {"Welcome back, ".split("").map((char, i) => (
                    <motion.span
                      key={`welcome-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.04, duration: 0.3 }}
                      className="inline-block"
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                  
                  {/* Animate the name with a highlight effect */}
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-[#ffc800] inline-block"
                  >
                    {firstName}
                  </motion.span>
                  
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 0.3 }}
                  >
                    !
                  </motion.span>
                </h1>
                
                <motion.p 
                  className="text-gray-600 dark:text-gray-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.5 }}
                >
                  Let's make some music today
                </motion.p>
              </motion.div>
            </div>
            
            {/* Enhanced Progress bar with musical beats */}
            <div className="mt-8 relative">
              {/* Musical beats above progress bar */}
              <div className="absolute -top-6 left-0 right-0 flex justify-between px-1">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={`beat-${i}`}
                    className="w-1 h-4 bg-[#ffc800] rounded-full"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: [0, 16, 4], 
                      opacity: [0, 1, 0.7]
                    }}
                    transition={{ 
                      delay: i * 0.75,
                      duration: 0.5, 
                      times: [0, 0.2, 1],
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
              
              {/* Progress bar background */}
              <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                {/* Progress bar fill */}
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#252e48] via-[#4a547a] to-[#ffc800]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
              
              {/* Music note at end of progress */}
              <motion.div
                className="absolute -right-4 -top-2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.8], x: [0, 5, 15], y: [0, -5, -15] }}
                transition={{ delay: 2.5, duration: 1.5 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17V8L18 6V15" stroke="#ffc800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="6" cy="17" r="3" fill="#ffc800"/>
                  <circle cx="15" cy="15" r="3" fill="#ffc800"/>
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}