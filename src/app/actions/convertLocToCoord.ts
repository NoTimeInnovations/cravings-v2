export default async function convertLocToCoord(url: string) {


  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  const response = await fetch(baseUrl + "/api/convert-coordinate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    }
  );

    const data = await response.json();

    if (!data.coordinates) {
      throw new Error(data?.error || "No coordinates found in response");
    }

    return data.coordinates;
}
