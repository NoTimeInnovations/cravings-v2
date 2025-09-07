'use server';

export async function getCoordinatesFromLink(link: string) {
  try{
    const coordinates = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/convert-coordinate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: link }),
      }
    );
  
    const coords =  await coordinates.json();
  
    console.log(`Fetching coordinates ` , coords);
    
  
    return  coords;  
  }catch(error){
    console.error("Error in getCoordinatesFromLink:", error);
    throw error;
  }
}
