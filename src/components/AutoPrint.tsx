"use client";
import React, { useEffect } from "react";

interface AutoPrintProps {
  children: React.ReactNode;
  id?: string; // Optional ID for the printable content
}

const AutoPrint: React.FC<AutoPrintProps> = ({ children, id = "printable-content" }) => {
  useEffect(() => {

    const printContent = () => {

      window.print();
      
    };

    printContent();
  }, [id]);

  return <div id={id}>{children}</div>;
};

export default AutoPrint;