import React from 'react'

// Tutorial data with headings and video embed URLs
const tutorialData = [
  {
    id: 1,
    heading: "How to do resaturent login",
    videoUrl: "https://www.youtube.com/embed/UGyePyi8hQU?si=rjglx2JlKMGDXJH7",
  },
  {
    id: 2,
    heading: "Advanced React Patterns",
    videoUrl: "https://www.youtube.com/embed/UGyePyi8hQU?si=rjglx2JlKMGDXJH7",
  },
]

export default function TutorialsPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Video Tutorials
        </h1>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          {tutorialData.map((tutorial) => (
            <div
              key={tutorial.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="aspect-w-16 aspect-h-9">
                <iframe 
                  className="w-full"
                  width="560" 
                  height="315" 
                  src={tutorial.videoUrl} 
                  title="YouTube video player"  
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share">
                </iframe>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {tutorial.heading}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
