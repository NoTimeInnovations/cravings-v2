import { motion } from "motion/react";

interface TourOverlayProps {
  targetRect: DOMRect | null;
}

export function TourOverlay({ targetRect }: TourOverlayProps) {
  const padding = 12;
  const borderRadius = 12;

  if (!targetRect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm pointer-events-none"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9998] pointer-events-none"
    >
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              initial={{
                x: targetRect.x - padding,
                y: targetRect.y - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
              }}
              animate={{
                x: targetRect.x - padding,
                y: targetRect.y - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Highlighted border around target */}
      <motion.div
        initial={{
          left: targetRect.x - padding,
          top: targetRect.y - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }}
        animate={{
          left: targetRect.x - padding,
          top: targetRect.y - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          borderRadius: `${borderRadius}px`,
          boxShadow: `
            0 0 0 3px rgba(234, 88, 12, 0.8),
            0 0 0 6px rgba(234, 88, 12, 0.4),
            0 0 20px 10px rgba(234, 88, 12, 0.3),
            inset 0 0 20px 2px rgba(234, 88, 12, 0.2)
          `,
          border: "3px solid rgb(234, 88, 12)",
        }}
      />

      {/* Pulsing glow effect */}
      <motion.div
        initial={{
          left: targetRect.x - padding - 4,
          top: targetRect.y - padding - 4,
          width: targetRect.width + padding * 2 + 8,
          height: targetRect.height + padding * 2 + 8,
          opacity: 0.6,
        }}
        animate={{
          left: targetRect.x - padding - 4,
          top: targetRect.y - padding - 4,
          width: targetRect.width + padding * 2 + 8,
          height: targetRect.height + padding * 2 + 8,
          opacity: [0.6, 0.3, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute pointer-events-none bg-orange-500/20 blur-xl"
        style={{
          borderRadius: `${borderRadius + 4}px`,
        }}
      />
    </motion.div>
  );
}
