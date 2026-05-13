import React, { useState, useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import { flushSync } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Video, Sparkles, Layers } from "lucide-react";

interface VideoNode {
  id: string;
  type: string;
  title: string;
  videoSrc: string;
  color: string;
  position: { x: number; y: number };
  icon: React.ComponentType<{ className?: string }>;
}

interface VideoConnection {
  from: string;
  to: string;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 130;

const initialNodes: VideoNode[] = [
  {
    id: "node-1",
    type: "Input",
    title: "Raw Clip A",
    videoSrc: "/5408604_Coll_wavebreak_People.mp4",
    color: "blue",
    position: { x: 20, y: 80 },
    icon: Video,
  },
  {
    id: "node-2",
    type: "Overlay",
    title: "B-Roll Blend",
    videoSrc: "/6010454_4k_Beautiful_3840x2160.mp4",
    color: "purple",
    position: { x: 280, y: 40 },
    icon: Layers,
  },
  {
    id: "node-3",
    type: "Output",
    title: "Final Master",
    videoSrc: "/6034682_Business_Up_3840x2160.mp4",
    color: "emerald",
    position: { x: 540, y: 100 },
    icon: Sparkles,
  },
];

const initialConnections: VideoConnection[] = [
  { from: "node-1", to: "node-2" },
  { from: "node-2", to: "node-3" },
];

const colorThemes: Record<string, { border: string; badgeBg: string; text: string }> = {
  blue: { border: "border-[#3275F8]/40", badgeBg: "bg-[#3275F8]/20", text: "text-[#3275F8]" },
  purple: { border: "border-purple-500/40", badgeBg: "bg-purple-500/20", text: "text-purple-400" },
  emerald: { border: "border-emerald-500/40", badgeBg: "bg-emerald-500/20", text: "text-emerald-400" },
};

function VideoConnectionCurve({
  from,
  to,
  nodes,
}: {
  from: string;
  to: string;
  nodes: VideoNode[];
}) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const startX = fromNode.position.x + NODE_WIDTH;
  const startY = fromNode.position.y + NODE_HEIGHT / 2;
  const endX = toNode.position.x;
  const endY = toNode.position.y + NODE_HEIGHT / 2;

  const cp1X = startX + (endX - startX) * 0.5;
  const cp2X = endX - (endX - startX) * 0.5;

  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`;

  return (
    <path
      d={path}
      fill="none"
      stroke="rgba(255, 255, 255, 0.4)"
      strokeWidth={2}
      strokeDasharray="6,5"
      strokeLinecap="round"
      className="transition-all duration-300"
    />
  );
}

export function VideoNodesWorkflowBuilder() {
  const [nodes, setNodes] = useState<VideoNode[]>(initialNodes);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [contentSize, setContentSize] = useState({ width: 800, height: 400 });

  const handleDragStart = (nodeId: string) => {
    setDraggingNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      dragStartPosition.current = { x: node.position.x, y: node.position.y };
    }
  };

  const handleDrag = (nodeId: string, { offset }: PanInfo) => {
    if (draggingNodeId !== nodeId || !dragStartPosition.current) return;

    const newX = dragStartPosition.current.x + offset.x;
    const newY = dragStartPosition.current.y + offset.y;

    // Constrain nodes to stay visible within reasonable coordinates
    const constrainedX = Math.max(0, newX);
    const constrainedY = Math.max(0, newY);

    flushSync(() => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, position: { x: constrainedX, y: constrainedY } }
            : node
        )
      );
    });

    setContentSize((prev) => ({
      width: Math.max(prev.width, constrainedX + NODE_WIDTH + 50),
      height: Math.max(prev.height, constrainedY + NODE_HEIGHT + 50),
    }));
  };

  const handleDragEnd = () => {
    setDraggingNodeId(null);
    dragStartPosition.current = null;
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col p-3 select-none">
      {/* Dynamic Header overlay */}
      <div className="flex items-center justify-between z-10 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3275F8] animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider text-white uppercase font-sans">
            Infinite Story Canvas
          </span>
        </div>
        <span className="text-[9px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          🖱️ Drag nodes freely to restructure timeline
        </span>
      </div>

      {/* Main Draggable Area */}
      <div className="relative flex-1 w-full overflow-auto pointer-events-auto rounded-xl border border-white/5 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]">
        <div
          className="relative"
          style={{
            minWidth: contentSize.width,
            minHeight: contentSize.height,
          }}
        >
          {/* SVG Dotted Spline Connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={contentSize.width}
            height={contentSize.height}
            style={{ overflow: "visible" }}
          >
            {initialConnections.map((c) => (
              <VideoConnectionCurve
                key={`${c.from}-${c.to}`}
                from={c.from}
                to={c.to}
                nodes={nodes}
              />
            ))}
          </svg>

          {/* Draggable Video Nodes */}
          {nodes.map((node) => {
            const Icon = node.icon;
            const theme = colorThemes[node.color] || colorThemes.blue;
            const isDragging = draggingNodeId === node.id;

            return (
              <motion.div
                key={node.id}
                drag
                dragMomentum={false}
                onDragStart={() => handleDragStart(node.id)}
                onDrag={(_, info) => handleDrag(node.id, info)}
                onDragEnd={handleDragEnd}
                style={{
                  x: node.position.x,
                  y: node.position.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                className="absolute cursor-grab active:cursor-grabbing"
                whileHover={{ scale: 1.02 }}
                whileDrag={{ scale: 1.05, zIndex: 50 }}
              >
                <Card
                  className={`relative w-full h-full overflow-hidden rounded-xl border ${theme.border} bg-black/80 shadow-xl backdrop-blur-md flex flex-col group transition-shadow ${isDragging ? "ring-2 ring-[#3275F8] shadow-2xl" : ""}`}
                >
                  {/* Top Header inside Node */}
                  <div className="absolute inset-x-0 top-0 h-7 bg-black/60 backdrop-blur-sm border-b border-white/10 px-2 flex items-center justify-between z-10">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3 h-3 ${theme.text}`} />
                      <span className="text-[10px] font-bold text-white tracking-wide truncate">
                        {node.title}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 border-none ${theme.badgeBg} ${theme.text}`}
                    >
                      {node.type}
                    </Badge>
                  </div>

                  {/* Embedded Looping Video taking remaining node real estate */}
                  <div className="relative w-full flex-1 mt-7 bg-[#050505] overflow-hidden">
                    <video
                      src={node.videoSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                    />
                    {/* Subtle Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Connection Node anchor visual dots */}
                  <div className="absolute left-0 top-1/2 w-1.5 h-3 bg-white/40 rounded-r transform -translate-y-1/2 pointer-events-none" />
                  <div className="absolute right-0 top-1/2 w-1.5 h-3 bg-[#3275F8] rounded-l transform -translate-y-1/2 pointer-events-none shadow-[0_0_8px_#3275F8]" />
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
