export const getImageSource = (imageUrl: string) => {
  switch (true) {
    case imageUrl.includes("swiggy"):
      return "swiggy";
    case imageUrl.includes("localhost"):
      return "local";
    case imageUrl.includes("cravingsbucket"):
      return "cravingsbucket";
    case imageUrl.includes("pollinations"):
      return "ai";
    default:
      return "local";
  }
};
