import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";

interface ShowAllBtnProps {
  showAll: boolean;
  onClick: () => void;
}

const ShowAllBtn = ({ showAll, onClick }: ShowAllBtnProps) => {
  return (
    <div className="flex justify-center items-center mt-4">

        <div className="w-full h-px bg-orange-400" />

      <Button
        onClick={onClick}
        className="bg-transparent transition-all duration-300 border border-orange-400 hover:text-white hover:bg-orange-600 text-orange-600 rounded-full flex items-center gap-2"
      >
        {showAll ? (
          <>
            Show Less <ChevronUp size={20} />
          </>
        ) : (
          <>
            Show More <ChevronDown size={20} />
          </>
        )}
      </Button>

      <div className="w-full h-px bg-orange-400" />

    </div>
  );
};

export default ShowAllBtn;