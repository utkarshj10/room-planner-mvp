"use client";

import { FormEvent, useEffect, useState } from "react";
import { checkBackendHealth, createRoom } from "../lib/api";

type Wall = "north" | "east" | "south" | "west";

type RoomForm = {
  name: string;
  width: string;
  length: string;
  unit: "ft" | "m";
};

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

type Furniture = {
  id: number;
  type: string;
  width: string;
  length: string;
  quantity: string;
};

const furniturePresets: Record<
  string,
  { width: number; length: number }
> = {
  "Single Bed": {
    width: 3,
    length: 6.25,
  },
  "Double Bed": {
    width: 4.5,
    length: 6.25,
  },
  "Queen Bed": {
    width: 5,
    length: 6.67,
  },
  "King Bed": {
    width: 6,
    length: 6.67,
  },
  Sofa: {
    width: 6,
    length: 3,
  },
  Desk: {
    width: 4,
    length: 2,
  },
  Wardrobe: {
    width: 5,
    length: 2,
  },
  "Dining Table": {
    width: 6,
    length: 3,
  },
  Chair: {
    width: 2,
    length: 2,
  },
  "TV Unit": {
    width: 5,
    length: 1.5,
  },
};

export default function Home() {
  const [backendConnected, setBackendConnected] = useState<boolean | null>(
    null
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [room, setRoom] = useState<RoomForm>({
    name: "",
    width: "",
    length: "",
    unit: "ft",
  });

  const [doors, setDoors] = useState<Door[]>([
    {
      id: 1,
      wall: "south",
      position: "",
      width: "",
    },
  ]);

  const [windows, setWindows] = useState<Window[]>([
    {
      id: 1,
      wall: "east",
      position: "",
      width: "",
    },
  ]);

  const [furniture, setFurniture] = useState<Furniture[]>([
    {
      id: 1,
      type: "Queen Bed",
      width: String(furniturePresets["Queen Bed"].width),
      length: String(furniturePresets["Queen Bed"].length),
      quantity: "1",
    },
  ]);

  const [roomId, setRoomId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendConnected(true))
      .catch(() => setBackendConnected(false));
  }, []);

  function updateRoomField(
    field: keyof RoomForm,
    value: string
  ) {
    setRoom((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function updateDoor(
    id: number,
    field: keyof Omit<Door, "id">,
    value: string
  ) {
    setDoors((current) =>
      current.map((door) =>
        door.id === id
          ? {
              ...door,
              [field]: value,
            }
          : door
      )
    );

    setError("");
  }

  function updateWindow(
    id: number,
    field: keyof Omit<Window, "id">,
    value: string
  ) {
    setWindows((current) =>
      current.map((window) =>
        window.id === id
          ? {
              ...window,
              [field]: value,
            }
          : window
      )
    );

    setError("");
  }

  function addDoor() {
    const nextId =
      doors.length > 0
        ? Math.max(...doors.map((door) => door.id)) + 1
        : 1;

    setDoors((current) => [
      ...current,
      {
        id: nextId,
        wall: "south",
        position: "",
        width: "",
      },
    ]);
  }

  function addWindow() {
    const nextId =
      windows.length > 0
        ? Math.max(...windows.map((window) => window.id)) + 1
        : 1;

    setWindows((current) => [
      ...current,
      {
        id: nextId,
        wall: "east",
        position: "",
        width: "",
      },
    ]);
  }

  function removeDoor(id: number) {
    setDoors((current) =>
      current.filter((door) => door.id !== id)
    );
  }

  function removeWindow(id: number) {
    setWindows((current) =>
      current.filter((window) => window.id !== id)
    );
  }

  function updateFurniture(
    id: number,
    field: keyof Omit<Furniture, "id">,
    value: string
  ) {
    setFurniture((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setError("");
    setSuccess("");
  }

  function changeFurnitureType(
    id: number,
    type: string
  ) {
    if (type === "Custom") {
      updateFurniture(id, "type", type);
      return;
    }

    const preset = furniturePresets[type];

    if (!preset) {
      return;
    }

    setFurniture((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              type,
              width: String(preset.width),
              length: String(preset.length),
            }
          : item
      )
    );

    setError("");
    setSuccess("");
  }

  function addFurniture() {
    const nextId =
      furniture.length > 0
        ? Math.max(
            ...furniture.map((item) => item.id)
          ) + 1
        : 1;

    setFurniture((current) => [
      ...current,
      {
        id: nextId,
        type: "Desk",
        width: String(furniturePresets.Desk.width),
        length: String(furniturePresets.Desk.length),
        quantity: "1",
      },
    ]);
  }

  function removeFurniture(id: number) {
    setFurniture((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  async function handleRoomSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const width = Number(room.width);
    const length = Number(room.length);

    if (!room.name.trim()) {
      setError("Please enter a room name.");
      return;
    }

    if (!room.width || Number.isNaN(width) || width <= 0) {
      setError("Please enter a valid room width.");
      return;
    }

    if (!room.length || Number.isNaN(length) || length <= 0) {
      setError("Please enter a valid room length.");
      return;
    }

    if (backendConnected === false) {
      setError(
        "The backend is not connected. Please make sure FastAPI is running."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createRoom({
        name: room.name.trim(),
        width,
        length,
        unit: room.unit,
      });

      setRoomId(result.id);
      setStep(2);
      setSuccess("");
    } catch {
      setError(
        "Something went wrong while creating the room. Please check that FastAPI is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDoorsAndWindowsSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (doors.length === 0) {
      setError("Please add at least one door.");
      return;
    }

    for (const door of doors) {
      const position = Number(door.position);
      const width = Number(door.width);

      if (
        !door.position ||
        Number.isNaN(position) ||
        position < 0
      ) {
        setError(
          `Please enter a valid position for Door ${door.id}.`
        );
        return;
      }

      if (
        !door.width ||
        Number.isNaN(width) ||
        width <= 0
      ) {
        setError(
          `Please enter a valid width for Door ${door.id}.`
        );
        return;
      }
    }

    for (const window of windows) {
      const position = Number(window.position);
      const width = Number(window.width);

      if (
        !window.position ||
        Number.isNaN(position) ||
        position < 0
      ) {
        setError(
          `Please enter a valid position for Window ${window.id}.`
        );
        return;
      }

      if (
        !window.width ||
        Number.isNaN(width) ||
        width <= 0
      ) {
        setError(
          `Please enter a valid width for Window ${window.id}.`
        );
        return;
      }
    }

    setStep(3);
  }

  function handleFurnitureSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (furniture.length === 0) {
      setError(
        "Please add at least one furniture item."
      );
      return;
    }

    for (const item of furniture) {
      const width = Number(item.width);
      const length = Number(item.length);
      const quantity = Number(item.quantity);

      if (!item.type) {
        setError("Please select a furniture type.");
        return;
      }

      if (
        !item.width ||
        Number.isNaN(width) ||
        width <= 0
      ) {
        setError(
          `Please enter a valid width for ${item.type}.`
        );
        return;
      }

      if (
        !item.length ||
        Number.isNaN(length) ||
        length <= 0
      ) {
        setError(
          `Please enter a valid length for ${item.type}.`
        );
        return;
      }

      if (
        !item.quantity ||
        Number.isNaN(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
      ) {
        setError(
          `Please enter a valid quantity for ${item.type}.`
        );
        return;
      }
    }

    console.log("Room:", room);
    console.log("Room ID:", roomId);
    console.log("Doors:", doors);
    console.log("Windows:", windows);
    console.log("Furniture:", furniture);

    setSuccess(
      "Furniture added successfully. The layout engine will be the next step."
    );
  }

  function goBackToRoom() {
    setStep(1);
    setError("");
    setSuccess("");
  }

  function goBackToDoors() {
    setStep(2);
    setError("");
    setSuccess("");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-6 py-10">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <header className="mb-12">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
              R
            </div>

            <span className="text-lg font-semibold">
              Room Planner
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-950">
            {step === 1
              ? "Create your room"
              : step === 2
              ? "Add doors & windows"
              : "Add your furniture"}
          </h1>

          <p className="mt-3 max-w-xl text-base leading-7 text-gray-600">
            {step === 1
              ? "Start by entering the basic dimensions of your room."
              : step === 2
              ? "Tell us where the entrances and windows are located so the layout engine can avoid blocking them."
              : "Add the furniture you want to place in the room. You can use common presets or enter custom dimensions."}
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-900">
              Step {step} of 4
            </span>

            <span className="text-gray-500">
              {step === 1
                ? "Room details"
                : step === 2
                ? "Doors & Windows"
                : "Furniture"}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full bg-black transition-all duration-300 ${
                step === 1
                  ? "w-1/4"
                  : step === 2
                  ? "w-1/2"
                  : "w-3/4"
              }`}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 text-xs text-gray-500">
            <span
              className={
                step >= 1
                  ? "font-medium text-gray-900"
                  : ""
              }
            >
              Room
            </span>

            <span
              className={`text-center ${
                step >= 2
                  ? "font-medium text-gray-900"
                  : ""
              }`}
            >
              Doors & Windows
            </span>

            <span
              className={`text-center ${
                step >= 3
                  ? "font-medium text-gray-900"
                  : ""
              }`}
            >
              Furniture
            </span>

            <span className="text-right">
              Layout
            </span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-950">
                Room details
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enter the dimensions exactly as they are in your room.
              </p>
            </div>

            <form onSubmit={handleRoomSubmit}>
              <div className="space-y-7">

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-800">
                    Room name
                  </span>

                  <input
                    type="text"
                    value={room.name}
                    onChange={(event) =>
                      updateRoomField(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="e.g. My Bedroom"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                  />
                </label>

                <div>
                  <span className="mb-3 block text-sm font-medium text-gray-800">
                    Room dimensions
                  </span>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <label className="block">
                      <span className="mb-2 block text-sm text-gray-600">
                        Width
                      </span>

                      <div className="relative">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={room.width}
                          onChange={(event) =>
                            updateRoomField(
                              "width",
                              event.target.value
                            )
                          }
                          placeholder="12"
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          {room.unit}
                        </span>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-gray-600">
                        Length
                      </span>

                      <div className="relative">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={room.length}
                          onChange={(event) =>
                            updateRoomField(
                              "length",
                              event.target.value
                            )
                          }
                          placeholder="10"
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          {room.unit}
                        </span>
                      </div>
                    </label>

                  </div>
                </div>

                <label className="block max-w-xs">
                  <span className="mb-2 block text-sm font-medium text-gray-800">
                    Unit
                  </span>

                  <select
                    value={room.unit}
                    onChange={(event) =>
                      updateRoomField(
                        "unit",
                        event.target.value as "ft" | "m"
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="ft">Feet</option>
                    <option value="m">Meters</option>
                  </select>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      backendConnected === true
                        ? "bg-green-500"
                        : backendConnected === false
                        ? "bg-red-500"
                        : "bg-gray-400"
                    }`}
                  />

                  {backendConnected === true
                    ? "Backend connected"
                    : backendConnected === false
                    ? "Backend unavailable"
                    : "Checking backend connection..."}
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Creating..."
                      : "Continue →"}
                  </button>
                </div>

              </div>
            </form>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            <form onSubmit={handleDoorsAndWindowsSubmit}>

              {/* Doors */}
              <div>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-950">
                      Doors
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Add every door that connects to this room.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addDoor}
                    className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                  >
                    + Add door
                  </button>
                </div>

                <div className="space-y-4">
                  {doors.map((door, index) => (
                    <div
                      key={door.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Door {index + 1}
                        </h3>

                        {doors.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeDoor(door.id)
                            }
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">

                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-gray-600">
                            Wall
                          </span>

                          <select
                            value={door.wall}
                            onChange={(event) =>
                              updateDoor(
                                door.id,
                                "wall",
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                          >
                            <option value="north">North</option>
                            <option value="east">East</option>
                            <option value="south">South</option>
                            <option value="west">West</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-gray-600">
                            Position
                          </span>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={door.position}
                              onChange={(event) =>
                                updateDoor(
                                  door.id,
                                  "position",
                                  event.target.value
                                )
                              }
                              placeholder="5"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-black"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {room.unit}
                            </span>
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-gray-600">
                            Width
                          </span>

                          <div className="relative">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={door.width}
                              onChange={(event) =>
                                updateDoor(
                                  door.id,
                                  "width",
                                  event.target.value
                                )
                              }
                              placeholder="3"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-black"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {room.unit}
                            </span>
                          </div>
                        </label>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="my-10 border-t border-gray-200" />

              {/* Windows */}
              <div>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-950">
                      Windows
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Add the windows that should remain accessible.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addWindow}
                    className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                  >
                    + Add window
                  </button>
                </div>

                <div className="space-y-4">
                  {windows.map((window, index) => (
                    <div
                      key={window.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Window {index + 1}
                        </h3>

                        {windows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeWindow(window.id)
                            }
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">

                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-gray-600">
                            Wall
                          </span>

                          <select
                            value={window.wall}
                            onChange={(event) =>
                              updateWindow(
                                window.id,
                                "wall",
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                          >
                            <option value="north">North</option>
                            <option value="east">East</option>
                            <option value="south">South</option>
                            <option value="west">West</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-gray-600">
                            Position
                          </span>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={window.position}
                              onChange={(event) =>
                                updateWindow(
                                  window.id,
                                  "position",
                                  event.target.value
                                )
                              }
                              placeholder="2"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-black"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {room.unit}
                            </span>
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-gray-600">
                            Width
                          </span>

                          <div className="relative">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={window.width}
                              onChange={(event) =>
                                updateWindow(
                                  window.id,
                                  "width",
                                  event.target.value
                                )
                              }
                              placeholder="5"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-black"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {room.unit}
                            </span>
                          </div>
                        </label>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={goBackToRoom}
                  className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
                >
                  Continue →
                </button>
              </div>

            </form>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            <form onSubmit={handleFurnitureSubmit}>

              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-950">
                    Furniture
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add every furniture item that needs to be placed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addFurniture}
                  className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  + Add furniture
                </button>
              </div>

              <div className="space-y-5">
                {furniture.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                  >

                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Furniture {index + 1}
                      </h3>

                      {furniture.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeFurniture(item.id)
                          }
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      {/* Type */}
                      <label className="block sm:col-span-2">
                        <span className="mb-2 block text-xs font-medium text-gray-600">
                          Furniture type
                        </span>

                        <select
                          value={item.type}
                          onChange={(event) =>
                            changeFurnitureType(
                              item.id,
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                        >
                          {Object.keys(furniturePresets).map(
                            (type) => (
                              <option
                                key={type}
                                value={type}
                              >
                                {type}
                              </option>
                            )
                          )}

                          <option value="Custom">
                            Custom
                          </option>
                        </select>
                      </label>

                      {/* Width */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium text-gray-600">
                          Width
                        </span>

                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.width}
                            onChange={(event) =>
                              updateFurniture(
                                item.id,
                                "width",
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-black"
                          />

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {room.unit}
                          </span>
                        </div>
                      </label>

                      {/* Length */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium text-gray-600">
                          Length
                        </span>

                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.length}
                            onChange={(event) =>
                              updateFurniture(
                                item.id,
                                "length",
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-black"
                          />

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {room.unit}
                          </span>
                        </div>
                      </label>

                      {/* Quantity */}
                      <label className="block sm:col-span-2">
                        <span className="mb-2 block text-xs font-medium text-gray-600">
                          Quantity
                        </span>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateFurniture(
                              item.id,
                              "quantity",
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                        />
                      </label>

                    </div>

                    <p className="mt-4 text-xs text-gray-400">
                      Position and rotation will be determined by
                      the layout engine later.
                    </p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={goBackToDoors}
                  className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
                >
                  Continue →
                </button>
              </div>

            </form>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Room dimensions, doors, windows, and furniture will be
          used by the layout engine.
        </p>
      </div>
    </main>
  );
}