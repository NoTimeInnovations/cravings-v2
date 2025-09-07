import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface CountdownTimerProps {
  endTime: string;
  upcoming: boolean;
}

export function CountdownTimer({ endTime, upcoming }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  function toISTString(time: string) {
    return dayjs.utc(time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  }

  function calculateTimeLeft() {
    const nowIst = toISTString(new Date().toISOString());
    const endIst = toISTString(endTime);

    const now = new Date(nowIst).getTime();
    const end = new Date(endIst).getTime();

    const distance = end - now;

    if (distance <= 0) {
      setTimeLeft({ days: -1, hours: -1, minutes: -1 });
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    setTimeLeft({ days, hours, minutes });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      calculateTimeLeft();
    }, 1000 * 60);

    calculateTimeLeft();

    return () => {
      clearInterval(interval);
    };
  }, [endTime]);

  if (timeLeft.days < 0) {
    return <span>Expired</span>;
  }

  if (upcoming) {
    return <span>Upcoming</span>;
  }

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0) {
    return <span>Calculating...</span>;
  }

  return (
    <span>
      {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
      <span>
        {timeLeft.hours}h {timeLeft.days > 0 ? null : timeLeft.minutes + "m"}
      </span>
    </span>
  );
}
