"use client";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

const DescriptionWithTextBreak = ({
  accent = "blue",
  children,
  className = "",
  spanClassName = "",
  showMore = true,
  maxWidth = 300,
  maxChars = 100,
  style = {},
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
  spanClassName?: string;
  maxWidth?: number;
  maxChars?: number;
  showMore?: boolean;
  style?: React.CSSProperties;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert children to string
  const text = React.Children.toArray(children).join("");

  // Check if text needs truncation
  const needsTruncation = text.length > maxChars;
  const displayText = isExpanded ? text : `${text.slice(0, maxChars)}${needsTruncation ? "..." : ""}`;

  return (
    <div className={className}>
      <p style={{
        margin: 0,
        padding: 0,
        lineHeight: 1.5,
        maxWidth: `${maxWidth}px`,
        wordBreak: "break-word",
        overflowWrap: "break-word",
        ...style,
      }}>
        <span className={cn(`opacity-70` , spanClassName)}>{displayText}</span>
        {(needsTruncation && showMore) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              color: accent,
              background: "none",
              opacity: 1,
              border: "none",
              padding: 0,
              paddingLeft: "4px",
              cursor: "pointer",
              display: "inline",
              whiteSpace: "nowrap",
            }}
          >
            {isExpanded ? " less" : " more"}
          </button>
        )}
      </p>
    </div>
  );
};

export default DescriptionWithTextBreak;