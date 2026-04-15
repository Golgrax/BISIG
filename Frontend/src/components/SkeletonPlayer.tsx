import React, { useRef, useEffect, useState } from "react";

interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface Frame {
  pose?: Landmark[];
  left_hand?: Landmark[];
  right_hand?: Landmark[];
  face?: Landmark[];
}

interface SkeletonPlayerProps {
  frames: Frame[];
  isPlaying: boolean;
  onEnded?: () => void;
  width?: number;
  height?: number;
}

const POSE = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16], // Torso & Arms
  [11, 23],
  [12, 24],
  [23, 24], // Hips/Waist
];

const FINGER_DATA = [
  {
    color: "#ffff00",
    conns: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    color: "#00ffff",
    conns: [
      [5, 6],
      [6, 7],
      [7, 8],
      [0, 5],
    ],
  },
  {
    color: "#ff00ff",
    conns: [
      [9, 10],
      [10, 11],
      [11, 12],
      [5, 9],
    ],
  },
  {
    color: "#00ff00",
    conns: [
      [13, 14],
      [14, 15],
      [15, 16],
      [9, 13],
    ],
  },
  {
    color: "#ffffff",
    conns: [
      [17, 18],
      [18, 19],
      [19, 20],
      [13, 17],
      [0, 17],
    ],
  },
];

const FACE = [
  // Lips
  [61, 146],
  [146, 91],
  [91, 181],
  [181, 84],
  [84, 17],
  [17, 314],
  [314, 405],
  [405, 321],
  [321, 375],
  [375, 291],
  [61, 185],
  [185, 40],
  [40, 39],
  [39, 37],
  [37, 0],
  [0, 267],
  [267, 269],
  [269, 270],
  [270, 409],
  [409, 291],
  // Left Eye
  [33, 7],
  [7, 163],
  [163, 144],
  [144, 145],
  [145, 153],
  [153, 154],
  [154, 155],
  [155, 133],
  [33, 246],
  [246, 161],
  [161, 160],
  [160, 159],
  [159, 158],
  [158, 157],
  [157, 173],
  [173, 133],
  // Right Eye
  [263, 249],
  [249, 390],
  [390, 373],
  [373, 374],
  [374, 380],
  [380, 381],
  [381, 382],
  [382, 362],
  [263, 466],
  [466, 388],
  [388, 387],
  [387, 386],
  [386, 385],
  [385, 384],
  [384, 398],
  [398, 362],
  // Eyebrows
  [70, 63],
  [63, 105],
  [105, 66],
  [66, 107],
  [107, 55],
  [300, 293],
  [293, 334],
  [334, 296],
  [296, 336],
  [336, 285],
  // Nose Bridge
  [168, 6],
  [6, 197],
  [197, 195],
  [195, 5],
];

const SkeletonPlayer: React.FC<SkeletonPlayerProps> = ({
  frames,
  isPlaying,
  onEnded,
  width = 640,
  height = 480,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const frameInterval = 1000 / 30; // 30 FPS
  const lastTimestampRef = useRef<number>(0);
  const requestRef = useRef<number>();
  const lastPlayedFrameRef = useRef<Frame | null>(null);
  const idleTimeRef = useRef<number>(0);
  const framesQueueRef = useRef<Frame[]>([]);
  const processedFramesCountRef = useRef<number>(0);

  useEffect(() => {
    if (frames.length > processedFramesCountRef.current) {
      const newFrames = frames.slice(processedFramesCountRef.current);
      framesQueueRef.current = [...framesQueueRef.current, ...newFrames];
      processedFramesCountRef.current = frames.length;
    } else if (frames.length === 0) {
      framesQueueRef.current = [];
      processedFramesCountRef.current = 0;
      lastPlayedFrameRef.current = null;
    }
  }, [frames]);

  const draw = (ctx: CanvasRenderingContext2D, frame: Frame) => {
    const w = width;
    const h = height;
    ctx.clearRect(0, 0, w, h);

    if (frame.face) {
      ctx.strokeStyle = "rgba(136, 136, 136, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      FACE.forEach(([s, e]) => {
        const p1 = frame.face![s];
        const p2 = frame.face![e];
        if (p1 && p2) {
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
        }
      });
      ctx.stroke();
    }

    if (frame.pose) {
      ctx.strokeStyle = "#00ff64";
      ctx.lineWidth = 3;
      ctx.beginPath();
      POSE.forEach(([s, e]) => {
        const p1 = frame.pose![s];
        const p2 = frame.pose![e];
        if (
          p1 &&
          p2 &&
          (p1.visibility ?? 1.0) > 0.5 &&
          (p2.visibility ?? 1.0) > 0.5
        ) {
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
        }
      });
      ctx.stroke();

      const activeIndices = new Set([
        11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28,
      ]);
      frame.pose.forEach((lm, idx) => {
        if (activeIndices.has(idx) && (lm.visibility ?? 1.0) > 0.5) {
          ctx.fillStyle = "#00ff00";
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    (["left_hand", "right_hand"] as const).forEach((key) => {
      if (frame[key]) {
        const hLms = frame[key]!;
        // Simple check to see if hand is "collapsed" or invalid
        if (hLms[4] && hLms[20]) {
          const isCollapsed =
            Math.abs(hLms[4].x - hLms[20].x) < 0.001 &&
            Math.abs(hLms[4].y - hLms[20].y) < 0.001;
          if (isCollapsed) return;
        }

        FINGER_DATA.forEach((finger) => {
          ctx.strokeStyle = finger.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          finger.conns.forEach(([s, e]) => {
            const p1 = hLms[s];
            const p2 = hLms[e];
            if (p1 && p2) {
              ctx.moveTo(p1.x * w, p1.y * h);
              ctx.lineTo(p2.x * w, p2.y * h);
            }
          });
          ctx.stroke();
        });

        hLms.forEach((lm) => {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });
  };

  const animate = (timestamp: number) => {
    if (!isPlaying) return;

    if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
    const elapsed = timestamp - lastTimestampRef.current;

    if (elapsed > frameInterval) {
      lastTimestampRef.current = timestamp - (elapsed % frameInterval);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (ctx) {
        let frame: Frame | undefined;

        if (framesQueueRef.current.length > 0) {
          frame = framesQueueRef.current.shift();
          lastPlayedFrameRef.current = JSON.parse(JSON.stringify(frame));
          idleTimeRef.current = 0;
        } else if (lastPlayedFrameRef.current) {
          // Idle Sway Logic from player.html
          frame = JSON.parse(
            JSON.stringify(lastPlayedFrameRef.current),
          ) as Frame;
          idleTimeRef.current += 0.05;
          const shift = Math.sin(idleTimeRef.current * 1.5) * 0.006;
          const sway = Math.cos(idleTimeRef.current * 0.8) * 0.005;

          if (frame.pose) {
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((idx) => {
              if (frame!.pose![idx]) {
                frame!.pose![idx].y += shift;
                frame!.pose![idx].x += sway;
              }
            });
            [13, 14, 15, 16].forEach((idx, i) => {
              if (frame!.pose![idx]) {
                frame!.pose![idx].y += shift * 2.5;
                frame!.pose![idx].x +=
                  sway + Math.sin(idleTimeRef.current + i) * 0.008;
              }
            });
          }
          if (frame.face) {
            frame.face.forEach((lm) => {
              lm.y += shift;
              lm.x += sway;
            });
          }

          if (frames.length > 0 && framesQueueRef.current.length === 0) {
            // We finished the animation but didn't have new frames.
            // We're just idling now.
            // If we want to signal onEnded, maybe only when the queue first becomes empty.
          }
        }

        if (frame) {
          draw(ctx, frame);
        } else if (frames.length > 0 && framesQueueRef.current.length === 0) {
          onEnded?.();
        }
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full object-contain bg-black rounded-lg"
    />
  );
};

export default SkeletonPlayer;
