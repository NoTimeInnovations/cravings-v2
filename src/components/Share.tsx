import { Badge } from "@/components/ui/badge";

interface ShareProps {
  offerId?: string | string[];
  hotelId?: string | string[];
  menuId?: string | string[];
  className?: string;
}
const Share = ({ offerId, hotelId, menuId, className }: ShareProps) => {
  const handleShare = () => {
    const offerLink = `${window.location.origin}/offers/${offerId}/`;
    const menuLink = `${window.location.origin}/hotels/${hotelId}/menu/${menuId}/`;

    const shareLink = menuId ? menuLink : offerLink;
    const shareTitle = menuId ? "Check out this menu item!" : "Check out this offer!";
    const shareText = menuId ? "Check out this menu item on our app!" : "Check out this offer on our app!";

    if (navigator.share) {
      navigator
        .share({
          title: shareTitle,
          text: shareText,
          url: shareLink,
        })
        .then(() => console.log("Successfully shared"))
        .catch((error) => console.error("Error sharing", error));
    } else {
      navigator.clipboard.writeText(shareLink).then(
        () => alert("Share link copied to clipboard"),
        (error) => console.error("Error copying to clipboard", error)
      );
    }
  };

  return (
    <Badge
      id="offer-share-btn"
      onClick={handleShare}
      className={` text-white/90 bg-transparent hover:bg-transparent hover:text-white transition-all cursor-pointer ${className}`}
    >
      <div className="flex flex-row-reverse gap-2">
        {/* <h1>Share</h1> */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-8 h-8 cursor-pointer text-white"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
          />
        </svg>
      </div>
    </Badge>
  );
};

export default Share;
