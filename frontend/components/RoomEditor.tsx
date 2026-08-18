"use client";

import { useMemo, useState } from "react";

type Wall = "north" | "east" | "south" | "west";

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
  onFurnitureChange: (furniture: FurnitureItem[]) => void;
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
  const [selectedId, setSelectedId] = useState<number | null>(
    furniture.length > 0 ? furniture[0].id : null
  );

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

  const selectedFurniture = furniture.find(
    (item) => item.id === selectedId
  );

  function updateFurniture(
    id: number,
    changes: Partial<FurnitureItem>
  ) {
    onFurnitureChange(
      furniture.map((item) =>
        item.id === id
          ? { ...item, ...changes }
          : item
      )
    );
  }

  function getFurnitureDimensions(item: FurnitureItem) {
    const width = Number(item.width);
    const length = Number(item.length);

    if (item.rotation % 180 === 0) {
      return {
        width,
        length,
      };
    }

    return {
      width: length,
      length: width,
    };
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

    const dimensions =
      getFurnitureDimensions(item);

    function handleMouseMove(moveEvent: MouseEvent) {
      const deltaX =
        (moveEvent.clientX - startX) / scale;

      const deltaY =
        (moveEvent.clientY - startY) / scale;

      const maxX =
        roomWidth - dimensions.width;

      const maxY =
        roomLength - dimensions.length;

      const newX = Math.max(
        0,
        Math.min(
          maxX,
          initialX + deltaX
        )
      );

      const newY = Math.max(
        0,
        Math.min(
          maxY,
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

    const currentDimensions =
      getFurnitureDimensions(
        selectedFurniture
      );

    const newRotation =
      (selectedFurniture.rotation + 90) % 360;

    const newWidth =
      currentDimensions.length;

    const newLength =
      currentDimensions.width;

    const maxX =
      roomWidth - newWidth;

    const maxY =
      roomLength - newLength;

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
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">

      {/* Floor plan */}
      <div className="flex min-h-[540px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 p-6">
        <div className="overflow-auto">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="overflow-visible rounded-lg bg-white shadow-lg"
            onClick={() => setSelectedId(null)}
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
                  Math.floor(roomWidth) + 1,
              }).map((_, index) => (
                <line
                  key={`vertical-${index}`}
                  x1={index * scale}
                  y1="0"
                  x2={index * scale}
                  y2={svgHeight}
                  stroke="black"
                  strokeWidth="1"
                />
              ))}

              {Array.from({
                length:
                  Math.floor(roomLength) + 1,
              }).map((_, index) => (
                <line
                  key={`horizontal-${index}`}
                  x1="0"
                  y1={index * scale}
                  x2={svgWidth}
                  y2={index * scale}
                  stroke="black"
                  strokeWidth="1"
                />
              ))}
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
                  x={position.x}
                  y={position.y}
                  width={position.width}
                  height={position.height}
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
                  x={position.x}
                  y={position.y}
                  width={position.width}
                  height={position.height}
                  fill="#93c5fd"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
              );
            })}

            {/* Furniture */}
            {furniture.map((item) => {
              const originalWidth =
                Number(item.width) * scale;

              const originalLength =
                Number(item.length) * scale;

              const dimensions =
                getFurnitureDimensions(item);

              const displayWidth =
                dimensions.width * scale;

              const displayHeight =
                dimensions.length * scale;

              const isSelected =
                item.id === selectedId;

              const centerX =
                item.x * scale +
                displayWidth / 2;

              const centerY =
                item.y * scale +
                displayHeight / 2;

              return (
                <g
                  key={item.id}
                >
                  <g
                    transform={`rotate(${item.rotation} ${centerX} ${centerY})`}
                  >
                    <rect
                      x={item.x * scale}
                      y={item.y * scale}
                      width={originalWidth}
                      height={originalLength}
                      rx="4"
                      fill={
                        isSelected
                          ? "#dbeafe"
                          : "#e5e7eb"
                      }
                      stroke={
                        isSelected
                          ? "#2563eb"
                          : "#6b7280"
                      }
                      strokeWidth={
                        isSelected ? "3" : "2"
                      }
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        setSelectedId(item.id);
                        handleDrag(
                          event,
                          item
                        );
                      }}
                    />

                    <text
                      x={
                        item.x * scale +
                        originalWidth / 2
                      }
                      y={
                        item.y * scale +
                        originalLength / 2
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(
                        10,
                        Math.min(
                          originalWidth / 5,
                          14
                        )
                      )}
                      fill="#111827"
                      pointerEvents="none"
                    >
                      {item.type}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="rounded-2xl border border-gray-200 bg-white p-5">

        <h2 className="text-lg font-semibold">
          Room
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {roomWidth} × {roomLength} {unit}
        </p>

        <div className="my-5 border-t border-gray-100" />

        <h3 className="text-sm font-semibold">
          Furniture
        </h3>

        <div className="mt-3 space-y-2">
          {furniture.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setSelectedId(item.id)
              }
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                selectedId === item.id
                  ? "bg-black text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {item.type}
            </button>
          ))}
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
                  {selectedFurniture.rotation}°
                </span>
              </div>

            </div>

            <button
              type="button"
              onClick={rotateSelected}
              className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              ↻ Rotate 90°
            </button>
          </>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500">
          Click furniture to select it. Drag it to
          move it. Use the rotate button to change
          its orientation.
        </div>

      </aside>
    </div>
  );
}