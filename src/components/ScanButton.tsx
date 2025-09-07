"use client";
import React from 'react';

const ScanButton = () => {
  const requestVideoPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // console.log('Video stream acquired:', stream);
      alert('Video permission granted!');
      // Do something with the video stream
    } catch (error) {
      console.error('Error accessing video:', error);
      alert('Unable to access video. Please check your permissions.');
    }
  };

  return (
    <div>
      <button
        onClick={requestVideoPermission}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007BFF',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Scan
      </button>
    </div>
  );
};

export default ScanButton;
