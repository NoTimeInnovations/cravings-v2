import { BellIcon, BellOffIcon } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import { toast } from 'sonner';

const AlertToggle = () => {
    const [isActive , setIsActive] = React.useState(true);
      const soundRef = useRef<Howl | null>(null);
    

      // Preload sound effect immediately
      useEffect(() => {
        soundRef.current = new Howl({
          src: ["/audio/tone.wav"],
          volume: 1,
          preload: true,
        });
      }, []);
    

    useEffect(() => {
        
        if(isActive) {
            soundRef.current?.play();
            localStorage?.setItem('alertActive', '1');
            toast.success('Order alert is now active');
        } else {
            localStorage?.setItem('alertActive', '0');
            soundRef.current?.stop();
            toast.error('Order alert is now inactive');
        }

    }, [isActive]);

  return (
    <div className='fixed top-0 left-1/2 -translate-x-1/2 -translate-y-0 z-[62]'>
        <div className='bg-black/80  rounded-full w-10 aspect-square grid place-items-center shadow-lg'>
            {
                isActive ? (
                    <BellIcon className='text-white w-5 h-5 cursor-pointer' onClick={() => setIsActive(false)} />
                ) : (
                    <BellOffIcon className='text-red-500 w-5 h-5 cursor-pointer' onClick={() => setIsActive(true)} />
                )
            }
        </div>
    </div>
  )
}

export default AlertToggle