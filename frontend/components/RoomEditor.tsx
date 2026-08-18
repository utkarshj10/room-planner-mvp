"use client";

import { useMemo, useState } from "react";

import {
  calculateLayout,
  generateLayouts,
  getFurnitureRectangle,
  type GeneratedLayout,
  type Opening,
} from "../lib/geometry";

type Wall =
  | "north"
  | "east"
  | "south"
  | "west";

type Door = {
  id: number;
  wall: Wall;
  position: string;
  width: string;
};

type Window = {
  id: number;
  wall: Wall;
  position: string;
  width: string;
};

export type FurnitureItem = {
  id: number;
  type: string;
  width: string;
  length: string;
  quantity: string;
  x: number;
  y: number;
  rotation: number;
};

type RoomEditorProps = {
  roomWidth: number;
  roomLength: number;
  unit: string;
  doors: Door[];
  windows: Window[];
  furniture: FurnitureItem[];
  onFurnitureChange: (
    furniture: FurnitureItem[]
  ) => void;
};

const MAX_EDITOR_WIDTH = 650;
const MAX_EDITOR_HEIGHT = 500;

export default function RoomEditor({
  roomWidth,
  roomLength,
  unit,
  doors,
  windows,
  furniture,
  onFurnitureChange,
}: RoomEditorProps) {
  const [selectedId, setSelectedId] =
    useState<number | null>(
      furniture.length > 0
        ? furniture[0].id
        : null
    );

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [generatedLayouts, setGeneratedLayouts] =
    useState<GeneratedLayout[]>([]);

  const scale = useMemo(() => {
    if (!roomWidth || !roomLength) {
      return 1;
    }

    return Math.min(
      MAX_EDITOR_WIDTH / roomWidth,
      MAX_EDITOR_HEIGHT / roomLength
    );
  }, [roomWidth, roomLength]);

  const svgWidth = roomWidth * scale;
  const svgHeight = roomLength * scale;

  const layoutResult = useMemo(() => {
    const doorOpenings: Opening[] =
      doors.map((door) => ({
        wall: door.wall,
        position: Number(door.position),
        width: Number(door.width),
      }));

    const windowOpenings: Opening[] =
      windows.map((window) => ({
        wall: window.wall,
        position: Number(window.position),
        width: Number(window.width),
      }));

    return calculateLayout(
      furniture,
      doorOpenings,
      windowOpenings,
      roomWidth,
      roomLength
    );
  }, [
    furniture,
    doors,
    windows,
    roomWidth,
    roomLength,
  ]);

  const selectedFurniture =
    furniture.find(
      (item) => item.id === selectedId
    );

  function updateFurniture(
    id: number,
    changes: Partial<FurnitureItem>
  ) {
    onFurnitureChange(
      furniture.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
            }
          : item
      )
    );
  }

  function handleDrag(
    event: React.MouseEvent<SVGRectElement>,
    item: FurnitureItem
  ) {
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    const initialX = item.x;
    const initialY = item.y;

    const initialRectangle =
      getFurnitureRectangle({
        id: item.id,
        type: item.type,
        x: item.x,
        y: item.y,
        width: Number(item.width),
        length: Number(item.length),
        rotation: item.rotation,
      });

    function handleMouseMove(
      moveEvent: MouseEvent
    ) {
      const deltaX =
        (moveEvent.clientX - startX) /
        scale;

      const deltaY =
        (moveEvent.clientY - startY) /
        scale;

      const newX = Math.max(
        0,
        Math.min(
          roomWidth -
            initialRectangle.width,
          initialX + deltaX
        )
      );

      const newY = Math.max(
        0,
        Math.min(
          roomLength -
            initialRectangle.height,
          initialY + deltaY
        )
      );

      updateFurniture(item.id, {
        x: Number(newX.toFixed(2)),
        y: Number(newY.toFixed(2)),
      });
    }

    function handleMouseUp() {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );
  }

  function rotateSelected() {
    if (!selectedFurniture) {
      return;
    }

    const currentRectangle =
      getFurnitureRectangle({
        id: selectedFurniture.id,
        type: selectedFurniture.type,
        x: selectedFurniture.x,
        y: selectedFurniture.y,
        width: Number(
          selectedFurniture.width
        ),
        length: Number(
          selectedFurniture.length
        ),
        rotation:
          selectedFurniture.rotation,
      });

    const newRotation =
      (selectedFurniture.rotation + 90) %
      360;

    const newWidth =
      currentRectangle.height;

    const newHeight =
      currentRectangle.width;

    const maxX =
      roomWidth - newWidth;

    const maxY =
      roomLength - newHeight;

    updateFurniture(
      selectedFurniture.id,
      {
        rotation: newRotation,
        x: Math.min(
          selectedFurniture.x,
          Math.max(0, maxX)
        ),
        y: Math.min(
          selectedFurniture.y,
          Math.max(0, maxY)
        ),
      }
    );
  }

  function handleGenerateLayouts() {
    if (furniture.length === 0) {
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const doorOpenings: Opening[] =
        doors.map((door) => ({
          wall: door.wall,
          position: Number(door.position),
          width: Number(door.width),
        }));

      const windowOpenings: Opening[] =
        windows.map((window) => ({
          wall: window.wall,
          position: Number(
            window.position
          ),
          width: Number(window.width),
        }));

      const layouts =
        generateLayouts(
          furniture,
          doorOpenings,
          windowOpenings,
          roomWidth,
          roomLength
        );

      setGeneratedLayouts(layouts);

      if (layouts.length > 0) {
        onFurnitureChange(
          layouts[0].furniture
        );

        setSelectedId(
          layouts[0].furniture[0]?.id ??
            null
        );
      }

      setIsGenerating(false);
    }, 100);
  }

  function selectLayout(
    layout: GeneratedLayout
  ) {
    onFurnitureChange(
      layout.furniture
    );

    setSelectedId(
      layout.furniture[0]?.id ??
        null
    );
  }

  function wallPosition(
    wall: Wall,
    position: string,
    width: string
  ) {
    const pos =
      Number(position) * scale;

    const itemWidth =
      Number(width) * scale;

    switch (wall) {
      case "north":
        return {
          x: pos,
          y: 0,
          width: itemWidth,
          height: 8,
        };

      case "south":
        return {
          x: pos,
          y: svgHeight - 8,
          width: itemWidth,
          height: 8,
        };

      case "east":
        return {
          x: svgWidth - 8,
          y: pos,
          width: 8,
          height: itemWidth,
        };

      case "west":
        return {
          x: 0,
          y: pos,
          width: 8,
          height: itemWidth,
        };
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

      {/* Floor plan */}
      <div className="flex min-h-[540px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 p-6">
        <div className="overflow-auto">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="overflow-visible rounded-lg bg-white shadow-lg"
            onClick={() =>
              setSelectedId(null)
            }
          >
            {/* Room */}
            <rect
              x="0"
              y="0"
              width={svgWidth}
              height={svgHeight}
              fill="white"
              stroke="black"
              strokeWidth="6"
            />

            {/* Grid */}
            <g opacity="0.08">
              {Array.from({
                length:
                  Math.floor(
                    roomWidth
                  ) + 1,
              }).map(
                (_, index) => (
                  <line
                    key={`v-${index}`}
                    x1={index * scale}
                    y1="0"
                    x2={index * scale}
                    y2={svgHeight}
                    stroke="black"
                    strokeWidth="1"
                  />
                )
              )}

              {Array.from({
                length:
                  Math.floor(
                    roomLength
                  ) + 1,
              }).map(
                (_, index) => (
                  <line
                    key={`h-${index}`}
                    x1="0"
                    y1={index * scale}
                    x2={svgWidth}
                    y2={index * scale}
                    stroke="black"
                    strokeWidth="1"
                  />
                )
              )}
            </g>

            {/* Doors */}
            {doors.map((door) => {
              const position =
                wallPosition(
                  door.wall,
                  door.position,
                  door.width
                );

              if (!position) {
                return null;
              }

              return (
                <rect
                  key={`door-${door.id}`}
                  {...position}
                  fill="#d1d5db"
                  stroke="#6b7280"
                  strokeWidth="2"
                />
              );
            })}

            {/* Windows */}
            {windows.map((window) => {
              const position =
                wallPosition(
                  window.wall,
                  window.position,
                  window.width
                );

              if (!position) {
                return null;
              }

              return (
                <rect
                  key={`window-${window.id}`}
                  {...position}
                  fill="#93c5fd"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
              );
            })}

            {/* Furniture */}
            {furniture.map((item) => {
              const rectangle =
                getFurnitureRectangle({
                  id: item.id,
                  type: item.type,
                  x: item.x,
                  y: item.y,
                  width: Number(item.width),
                  length: Number(item.length),
                  rotation: item.rotation,
                });

              const width =
                rectangle.width * scale;

              const height =
                rectangle.height * scale;

              const centerX =
                item.x * scale +
                width / 2;

              const centerY =
                item.y * scale +
                height / 2;

              const isSelected =
                item.id === selectedId;

              const hasIssue =
                layoutResult.issues.some(
                  (issue) =>
                    issue.furnitureId ===
                    item.id
                );

              return (
                <g
                  key={item.id}
                  onClick={(event) => {
                    event.stopPropagation();

                    setSelectedId(
                      item.id
                    );
                  }}
                >
                  <rect
                    x={item.x * scale}
                    y={item.y * scale}
                    width={width}
                    height={height}
                    rx="4"
                    fill={
                      hasIssue
                        ? "#fee2e2"
                        : isSelected
                        ? "#dbeafe"
                        : "#e5e7eb"
                    }
                    stroke={
                      hasIssue
                        ? "#dc2626"
                        : isSelected
                        ? "#2563eb"
                        : "#6b7280"
                    }
                    strokeWidth={
                      isSelected ? 3 : 2
                    }
                    className="cursor-move"
                    onMouseDown={(event) =>
                      handleDrag(
                        event,
                        item
                      )
                    }
                  />

                  <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(
                      10,
                      Math.min(
                        width / 5,
                        14
                      )
                    )}
                    fill="#111827"
                    pointerEvents="none"
                  >
                    {item.type}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="rounded-2xl border border-gray-200 bg-white p-5">

        <h2 className="text-lg font-semibold">
          Layout status
        </h2>

        <div className="mt-3 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Score
            </span>

            <span className="text-2xl font-bold">
              {layoutResult.score}
            </span>
          </div>

          <p
            className={`mt-2 text-sm font-medium ${
              layoutResult.valid
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {layoutResult.valid
              ? "Layout is valid"
              : "Layout needs improvement"}
          </p>
        </div>

        {layoutResult.issues.length >
          0 && (
          <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
              Issues
            </p>

            <div className="space-y-2">
              {layoutResult.issues.map(
                (issue, index) => (
                  <p
                    key={`${issue.furnitureId}-${index}`}
                    className="text-xs leading-5 text-red-700"
                  >
                    • {issue.message}
                  </p>
                )
              )}
            </div>
          </div>
        )}

        <div className="my-5 border-t border-gray-100" />

        <h3 className="text-sm font-semibold">
          Furniture
        </h3>

        <div className="mt-3 space-y-2">
          {furniture.map((item) => {
            const hasIssue =
              layoutResult.issues.some(
                (issue) =>
                  issue.furnitureId ===
                  item.id
              );

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelectedId(
                    item.id
                  )
                }
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedId === item.id
                    ? "bg-black text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <span>
                  {item.type}
                </span>

                {hasIssue && (
                  <span className="text-red-500">
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedFurniture && (
          <>
            <div className="my-5 border-t border-gray-100" />

            <h3 className="text-sm font-semibold">
              Selected furniture
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              {selectedFurniture.type}
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Width
                </span>

                <span>
                  {selectedFurniture.width}{" "}
                  {unit}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Length
                </span>

                <span>
                  {selectedFurniture.length}{" "}
                  {unit}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  X
                </span>

                <span>
                  {selectedFurniture.x.toFixed(
                    2
                  )}{" "}
                  {unit}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Y
                </span>

                <span>
                  {selectedFurniture.y.toFixed(
                    2
                  )}{" "}
                  {unit}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Rotation
                </span>

                <span>
                  {
                    selectedFurniture.rotation
                  }
                  °
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={rotateSelected}
              className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              ↻ Rotate 90°
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleGenerateLayouts}
          disabled={isGenerating}
          className="mt-6 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isGenerating
            ? "Generating layouts..."
            : "✨ Generate 3 Layouts"}
        </button>

        {generatedLayouts.length >
          0 && (
          <div className="mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">
              Suggested layouts
            </h3>

            <div className="mt-3 space-y-2">
              {generatedLayouts.map(
                (layout, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      selectLayout(
                        layout
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium">
                      Layout{" "}
                      {index + 1}
                    </span>

                    <span className="text-sm font-semibold">
                      {layout.score}/100
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500">
          Generate multiple valid arrangements
          and choose the one that works best for
          your room.
        </div>
      </aside>
    </div>
  );
}