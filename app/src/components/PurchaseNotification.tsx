"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PurchaseNotificationProps {
  show: boolean;
  productName: string;
}

export default function PurchaseNotification({
  show,
  productName,
}: PurchaseNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initialize audio on first render
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/purchase.mp3");
      // Try to preload the audio
      audioRef.current.load();
    }
  }, []);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (show) {
      setIsVisible(true);

      // Try to play sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reset audio to start
        audioRef.current.play().catch((error) => {
          console.log("Audio playback failed:", error);
        });
      }

      // Set timeout to hide notification
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } else {
      setIsVisible(false);
    }

    // Cleanup timeout on unmount or when show changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Purchase successful: {productName}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
