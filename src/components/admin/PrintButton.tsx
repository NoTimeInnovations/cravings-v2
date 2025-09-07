import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import { Printer } from "lucide-react";

const PrintButton = ({ href, text }: { href: string; text: string }) => {
    
  return (
    <Link href={href} target="_blank" passHref className="flex-1 sm:flex-none">
      <Button size="sm" variant="outline" className="w-full sm:w-auto">
        <Printer className="h-4 w-4 mr-2" />
        {text}
      </Button>
    </Link>
  );
};

export default PrintButton;
