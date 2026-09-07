"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
  variant?: "default" | "split" | "boxes";
  numberClassName?: string;
  labelClassName?: string;
}

export default function CountdownTimer({ 
  targetDate, 
  className = "", 
  variant = "default",
  numberClassName = "text-2xl font-black",
  labelClassName = "text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-80"
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: "0", minutes: "0", seconds: "0" });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft({ hours: "0", minutes: "0", seconds: "0" });
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: hours.toString(),
        minutes: minutes.toString(),
        seconds: seconds.toString()
      });
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [targetDate]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    if (variant === "split") {
      return (
        <div className={`grid grid-cols-3 ${className}`}>
          <div className="flex flex-col items-center justify-center border-r border-inherit last:border-r-0">
            <span className={numberClassName}>--</span>
            <span className={labelClassName}>Hours</span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-inherit last:border-r-0">
            <span className={numberClassName}>--</span>
            <span className={labelClassName}>Minutes</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className={numberClassName}>--</span>
            <span className={labelClassName}>Seconds</span>
          </div>
        </div>
      );
    }
    if (variant === "boxes") {
      return (
        <>
          <span className={numberClassName}>--</span>
          <span className={numberClassName}>--</span>
          <span className={numberClassName}>--</span>
        </>
      );
    }
    return <span className={className}>--h --m --s</span>;
  }

  if (variant === "split") {
    return (
      <div className={`grid grid-cols-3 ${className}`}>
        <div className="flex flex-col items-center justify-center border-r border-inherit last:border-r-0">
          <span className={numberClassName}>{timeLeft.hours}</span>
          <span className={labelClassName}>Hours</span>
        </div>
        <div className="flex flex-col items-center justify-center border-r border-inherit last:border-r-0">
          <span className={numberClassName}>{timeLeft.minutes}</span>
          <span className={labelClassName}>Minutes</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className={numberClassName}>{timeLeft.seconds}</span>
          <span className={labelClassName}>Seconds</span>
        </div>
      </div>
    );
  }

  if (variant === "boxes") {
    return (
      <>
        <span className={numberClassName}>{timeLeft.hours}</span>
        <span className={numberClassName}>{timeLeft.minutes}</span>
        <span className={numberClassName}>{timeLeft.seconds}</span>
      </>
    );
  }

  return <span className={className}>{`${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}</span>;
}
