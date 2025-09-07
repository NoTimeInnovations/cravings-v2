async function subscribeTopic(token: string) {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_SERVER_URL + "/api/topic/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    const data = await response.json();
    if (data.error) {
      throw new Error(data?.error);
    } else {
      console.log("Offer notifications turned on!");
    }
  } catch (error) {
    console.error("Failed to turn on offer notifications", error);
  }
}

export default subscribeTopic;
