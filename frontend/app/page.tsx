"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  checkBackendHealth,
  createRoom,
  deleteLayout,
  getSavedLayouts,
  saveLayout,
  SavedLayout,
} from "../lib/api";
import RoomEditor, {
  FurnitureItem,
} from "../components/RoomEditor";
import { calculateLayout } from "../lib/geometry";

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

const furniturePresets: Record<
  string,
  { width: number; length: number }
> = {
  "Single Bed": { width: 3, length: 6.25 },
  "Double Bed": { width: 4.5, length: 6.25 },
  "Queen Bed": { width: 5, length: 6.67 },
  "King Bed": { width: 6, length: 6.67 },
  Sofa: { width: 6, length: 3 },
  Desk: { width: 4, length: 2 },
  Wardrobe: { width: 5, length: 2 },
  "Dining Table": { width: 6, length: 3 },
  Chair: { width: 2, length: 2 },
  "TV Unit": { width: 5, length: 1.5 },
};

export default function Home() {
  const [backendConnected, setBackendConnected] =
    useState<boolean | null>(null);

  const [step, setStep] = useState<
    1 | 2 | 3 | 4
  >(1);

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

  const [furniture, setFurniture] =
    useState<FurnitureItem[]>([
      {
        id: 1,
        type: "Queen Bed",
        width: "5",
        length: "6.67",
        quantity: "1",
        x: 1,
        y: 1,
        rotation: 0,
      },
    ]);

  const [roomId, setRoomId] =
    useState<string | null>(null);

  const [savedLayouts, setSavedLayouts] =
    useState<SavedLayout[]>([]);

  const [layoutName, setLayoutName] =
    useState("");

  const [isSavingLayout, setIsSavingLayout] =
    useState(false);

  const [isLoadingLayouts, setIsLoadingLayouts] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [roomSessions, setRoomSessions] = useState<Record<string, any>>({});
  const [showRoomList, setShowRoomList] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const [advisorResult, setAdvisorResult] = useState<{
    score: number;
    strengths: string[];
    issues: string[];
    suggestions: string[];
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendConnected(true))
      .catch(() => setBackendConnected(false));
  }, []);

  useEffect(() => {
    const savedSessions = localStorage.getItem("roomPlannerSessions");
    const legacySession = localStorage.getItem("roomPlannerSession");

    if (!savedSessions && legacySession) {
      try {
        const oldSession = JSON.parse(legacySession);
        if (oldSession?.roomId) {
          const migrated = { [oldSession.roomId]: oldSession };
          localStorage.setItem("roomPlannerSessions", JSON.stringify(migrated));
          localStorage.setItem("roomPlannerLastRoomId", oldSession.roomId);
        }
      } catch {
        localStorage.removeItem("roomPlannerSession");
      }
    }

    const raw = localStorage.getItem("roomPlannerSessions");
    if (!raw) {
      setIsRestoringSession(false);
      return;
    }

    try {
      const sessions = JSON.parse(raw);
      if (!sessions || typeof sessions !== "object") throw new Error("Invalid sessions");
      setRoomSessions(sessions);
      const lastId = localStorage.getItem("roomPlannerLastRoomId");
      const session = lastId && sessions[lastId] ? sessions[lastId] : Object.values(sessions)[0];
      if (session?.roomId) {
        setRoomId(session.roomId);
        setRoom(session.room);
        setDoors(session.doors || []);
        setWindows(session.windows || []);
        setFurniture(session.furniture || []);
        setStep(4);
        getSavedLayouts(session.roomId).then(setSavedLayouts).catch(() => setSavedLayouts([]));
      }
    } catch {
      localStorage.removeItem("roomPlannerSessions");
      localStorage.removeItem("roomPlannerLastRoomId");
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  useEffect(() => {
    if (isRestoringSession || !roomId) return;
    const session = { roomId, room, doors, windows, furniture };
    const raw = localStorage.getItem("roomPlannerSessions");
    let sessions: Record<string, any> = {};
    try { sessions = raw ? JSON.parse(raw) : {}; } catch { sessions = {}; }
    const updated = { ...sessions, [roomId]: session };
    setRoomSessions(updated);
    localStorage.setItem("roomPlannerSessions", JSON.stringify(updated));
    localStorage.setItem("roomPlannerLastRoomId", roomId);
  }, [isRestoringSession, roomId, room, doors, windows, furniture]);

  function analyzeLayout() {
    setIsAnalyzing(true);
    setAdvisorResult(null);
    setError("");

    try {
      const roomWidth = Number(room.width);
      const roomLength = Number(room.length);

      const result = calculateLayout(
        furniture.map((item) => ({
          id: item.id,
          type: item.type,
          x: Number(item.x ?? 0),
          y: Number(item.y ?? 0),
          width: Number(item.width),
          length: Number(item.length),
          rotation: Number(item.rotation ?? 0),
        })),
        doors.map((door) => ({
          wall: door.wall,
          position: Number(door.position),
          width: Number(door.width),
        })),
        windows.map((window) => ({
          wall: window.wall,
          position: Number(window.position),
          width: Number(window.width),
        })),
        roomWidth,
        roomLength
      );

      const issues = result.issues.map((issue) => issue.message);
      const uniqueIssues = [...new Set(issues)].slice(0, 5);
      const strengths: string[] = [];
      const suggestions: string[] = [];

      if (result.valid) {
        strengths.push("All furniture is inside the room.");
        strengths.push("No furniture is directly overlapping another item.");
      }

      if (!result.issues.some((issue) => issue.type === "door_collision")) {
        strengths.push("The entrance areas are kept clear.");
      } else {
        suggestions.push("Move furniture away from the entrance so the door area stays usable.");
      }

      if (!result.issues.some((issue) => issue.type === "window_collision")) {
        strengths.push("Windows are not directly blocked by furniture.");
      } else {
        suggestions.push("Move furniture away from the windows to keep them accessible.");
      }

      if (result.issues.some((issue) => issue.type === "clearance")) {
        suggestions.push("Increase the gap between nearby furniture to improve walking space.");
      } else {
        strengths.push("Furniture has reasonable separation.");
      }

      if (furniture.length >= 2) {
        const centerX = roomWidth / 2;
        const centerY = roomLength / 2;
        const centerBlocked = furniture.some((item) => {
          const rotated = Number(item.rotation ?? 0) % 180 !== 0;
          const width = rotated ? Number(item.length) : Number(item.width);
          const height = rotated ? Number(item.width) : Number(item.length);
          return (
            Number(item.x) < centerX + 1 &&
            Number(item.x) + width > centerX - 1 &&
            Number(item.y) < centerY + 1 &&
            Number(item.y) + height > centerY - 1
          );
        });

        if (!centerBlocked) {
          strengths.push("The center of the room remains relatively open.");
        } else {
          suggestions.push("Consider moving one large item toward a wall to open the center of the room.");
        }
      }

      if (uniqueIssues.length > 0) {
        suggestions.push(...uniqueIssues);
      }

      if (strengths.length === 0) {
        strengths.push("The layout has been checked against the room geometry.");
      }

      if (suggestions.length === 0) {
        suggestions.push("The arrangement looks solid. Try the generated alternatives if you want more options.");
      }

      setAdvisorResult({
        score: result.score,
        strengths: [...new Set(strengths)].slice(0, 4),
        issues: uniqueIssues,
        suggestions: [...new Set(suggestions)].slice(0, 5),
      });
    } catch {
      setError("Could not analyze this layout.");
    } finally {
      setIsAnalyzing(false);
    }
  }

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
          ? { ...door, [field]: value }
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
          ? { ...window, [field]: value }
          : window
      )
    );

    setError("");
  }

  function addDoor() {
    const nextId =
      doors.length > 0
        ? Math.max(
            ...doors.map((door) => door.id)
          ) + 1
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
        ? Math.max(
            ...windows.map(
              (window) => window.id
            )
          ) + 1
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
      current.filter(
        (door) => door.id !== id
      )
    );
  }

  function removeWindow(id: number) {
    setWindows((current) =>
      current.filter(
        (window) => window.id !== id
      )
    );
  }

  function updateFurniture(
    id: number,
    field: keyof Omit<
      FurnitureItem,
      "id" | "x" | "y" | "rotation"
    >,
    value: string
  ) {
    setFurniture((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );

    setError("");
  }

  function changeFurnitureType(
    id: number,
    type: string
  ) {
    if (type === "Custom") {
      updateFurniture(
        id,
        "type",
        type
      );
      return;
    }

    const preset =
      furniturePresets[type];

    if (!preset) {
      return;
    }

    setFurniture((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              type,
              width: String(
                preset.width
              ),
              length: String(
                preset.length
              ),
            }
          : item
      )
    );
  }

  function addFurniture() {
    const nextId =
      furniture.length > 0
        ? Math.max(
            ...furniture.map(
              (item) => item.id
            )
          ) + 1
        : 1;

    setFurniture((current) => [
      ...current,
      {
        id: nextId,
        type: "Desk",
        width: "4",
        length: "2",
        quantity: "1",
        x: 1,
        y: 1,
        rotation: 0,
      },
    ]);
  }

  function removeFurniture(id: number) {
    setFurniture((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  }

  function openRoom(session: any) {
    setRoomId(session.roomId);
    setRoom(session.room);
    setDoors(session.doors || []);
    setWindows(session.windows || []);
    setFurniture(session.furniture || []);
    setSavedLayouts([]);
    setLayoutName("");
    setError("");
    setSuccess("");
    setShowRoomList(false);
    setStep(4);
    localStorage.setItem("roomPlannerLastRoomId", session.roomId);
    getSavedLayouts(session.roomId).then(setSavedLayouts).catch(() => setSavedLayouts([]));
  }

  function showMyRooms() {
    setShowRoomList(true);
    setError("");
    setSuccess("");
  }

  function startNewRoom() {
    setRoomId(null);
    setRoom({ name: "", width: "", length: "", unit: "ft" });
    setDoors([{ id: 1, wall: "south", position: "", width: "" }]);
    setWindows([{ id: 1, wall: "east", position: "", width: "" }]);
    setFurniture([{ id: 1, type: "Queen Bed", width: "5", length: "6.67", quantity: "1", x: 1, y: 1, rotation: 0 }]);
    setSavedLayouts([]);
    setLayoutName("");
    setError("");
    setSuccess("");
    setShowRoomList(false);
    setStep(1);
  }

  async function handleRoomSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const width = Number(room.width);
    const length = Number(room.length);

    if (!room.name.trim()) {
      setError(
        "Please enter a room name."
      );
      return;
    }

    if (
      !room.width ||
      Number.isNaN(width) ||
      width <= 0
    ) {
      setError(
        "Please enter a valid room width."
      );
      return;
    }

    if (
      !room.length ||
      Number.isNaN(length) ||
      length <= 0
    ) {
      setError(
        "Please enter a valid room length."
      );
      return;
    }

    if (backendConnected === false) {
      setError(
        "The backend is not connected."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const result =
        await createRoom({
          name: room.name.trim(),
          width,
          length,
          unit: room.unit,
        });

      setRoomId(result.id);
      setStep(2);
    } catch {
      setError(
        "Could not create the room."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDoorsSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    for (const door of doors) {
      const position = Number(
        door.position
      );
      const width = Number(
        door.width
      );

      if (
        !door.position ||
        Number.isNaN(position) ||
        position < 0
      ) {
        setError(
          `Enter a valid position for Door ${door.id}.`
        );
        return;
      }

      if (
        !door.width ||
        Number.isNaN(width) ||
        width <= 0
      ) {
        setError(
          `Enter a valid width for Door ${door.id}.`
        );
        return;
      }
    }

    for (const window of windows) {
      const position = Number(
        window.position
      );
      const width = Number(
        window.width
      );

      if (
        !window.position ||
        Number.isNaN(position) ||
        position < 0
      ) {
        setError(
          `Enter a valid position for Window ${window.id}.`
        );
        return;
      }

      if (
        !window.width ||
        Number.isNaN(width) ||
        width <= 0
      ) {
        setError(
          `Enter a valid width for Window ${window.id}.`
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

    for (const item of furniture) {
      const width = Number(
        item.width
      );
      const length = Number(
        item.length
      );
      const quantity = Number(
        item.quantity
      );

      if (
        !item.width ||
        Number.isNaN(width) ||
        width <= 0
      ) {
        setError(
          `Enter a valid width for ${item.type}.`
        );
        return;
      }

      if (
        !item.length ||
        Number.isNaN(length) ||
        length <= 0
      ) {
        setError(
          `Enter a valid length for ${item.type}.`
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
          `Enter a valid quantity for ${item.type}.`
        );
        return;
      }
    }

    setStep(4);
  }

  async function loadSavedLayouts() {
    if (!roomId) {
      return;
    }

    try {
      setIsLoadingLayouts(true);
      setError("");

      const layouts =
        await getSavedLayouts(roomId);

      setSavedLayouts(layouts);
    } catch {
      setError(
        "Could not load saved layouts."
      );
    } finally {
      setIsLoadingLayouts(false);
    }
  }

  async function handleSaveLayout() {
    if (!roomId) {
      setError(
        "Create a room before saving a layout."
      );
      return;
    }

    const name =
      layoutName.trim() ||
      `Layout ${savedLayouts.length + 1}`;

    try {
      setIsSavingLayout(true);
      setError("");
      setSuccess("");

      const saved =
        await saveLayout(
          roomId,
          name,
          furniture
        );

      setSavedLayouts((current) => [
        saved,
        ...current,
      ]);

      setLayoutName("");
      setSuccess(
        `"${name}" saved successfully.`
      );
    } catch {
      setError(
        "Could not save the layout."
      );
    } finally {
      setIsSavingLayout(false);
    }
  }

  function handleLoadLayout(
    layout: SavedLayout
  ) {
    setFurniture(
      layout.furniture as FurnitureItem[]
    );

    setError("");
    setSuccess(
      `"${layout.name}" loaded.`
    );
  }

  async function handleDeleteLayout(
    layoutId: string
  ) {
    try {
      setError("");
      setSuccess("");

      await deleteLayout(layoutId);

      setSavedLayouts((current) =>
        current.filter(
          (layout) =>
            layout.id !== layoutId
        )
      );

      setSuccess(
        "Layout deleted successfully."
      );
    } catch {
      setError(
        "Could not delete the layout."
      );
    }
  }

  function goBack(stepNumber: 1 | 2 | 3) {
    setStep(stepNumber);
    setError("");
    setSuccess("");
  }

  if (isRestoringSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">R</div>
          <p className="text-sm text-gray-600">Restoring your room...</p>
        </div>
      </main>
    );
  }

  if (showRoomList) {
    const rooms = Object.values(roomSessions) as any[];
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">R</div><span className="text-lg font-semibold">Room Planner</span></div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-950">My Rooms</h1>
            <p className="mt-2 text-gray-600">Switch rooms or create a new one.</p>
          </div>
          <div className="space-y-4">
            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500">No rooms yet.</div>
            ) : rooms.map((session) => (
              <div key={session.roomId} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="font-semibold text-gray-950">{session.room.name}</h2><p className="mt-1 text-sm text-gray-500">{session.room.width} × {session.room.length} {session.room.unit}</p></div>
                <button type="button" onClick={() => openRoom(session)} className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">Open room</button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={startNewRoom} className="rounded-xl bg-black px-5 py-3 font-semibold text-white">+ Create new room</button>
            {roomId && <button type="button" onClick={() => setShowRoomList(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium">Back to editor</button>}
          </div>
        </div>
      </main>
    );
  }

  const progressWidth =
    step === 1
      ? "w-1/4"
      : step === 2
      ? "w-1/2"
      : step === 3
      ? "w-3/4"
      : "w-full";

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8">
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
              : step === 3
              ? "Add your furniture"
              : "Arrange your room"}
          </h1>

          <p className="mt-2 max-w-xl text-gray-600">
            {step === 4
              ? "Drag your furniture around the floor plan and experiment with different arrangements."
              : "Define your room so we can build an accurate floor plan."}
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-semibold">
              Step {step} of 4
            </span>

            <span className="text-gray-500">
              {step === 4
                ? "Room editor"
                : ""}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full bg-black transition-all ${progressWidth}`}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 text-xs text-gray-500">
            <span className="font-medium text-gray-900">
              Room
            </span>
            <span className="text-center">
              Doors & Windows
            </span>
            <span className="text-center">
              Furniture
            </span>
            <span className="text-right">
              Layout
            </span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold">
              Room details
            </h2>

            <form
              onSubmit={handleRoomSubmit}
              className="mt-8 space-y-7"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Room name
                </span>

                <input
                  value={room.name}
                  onChange={(e) =>
                    updateRoomField(
                      "name",
                      e.target.value
                    )
                  }
                  placeholder="My Bedroom"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium">
                    Width
                  </span>

                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={room.width}
                    onChange={(e) =>
                      updateRoomField(
                        "width",
                        e.target.value
                      )
                    }
                    placeholder="12"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium">
                    Length
                  </span>

                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={room.length}
                    onChange={(e) =>
                      updateRoomField(
                        "length",
                        e.target.value
                      )
                    }
                    placeholder="10"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </label>
              </div>

              <label className="block max-w-xs">
                <span className="mb-2 block text-sm font-medium">
                  Unit
                </span>

                <select
                  value={room.unit}
                  onChange={(e) =>
                    updateRoomField(
                      "unit",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                >
                  <option value="ft">
                    Feet
                  </option>
                  <option value="m">
                    Meters
                  </option>
                </select>
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end border-t pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Creating..."
                    : "Continue →"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <form
              onSubmit={handleDoorsSubmit}
              className="space-y-10"
            >

              {/* Doors */}
              <div>
                <div className="mb-5 flex justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Doors
                    </h2>

                    <p className="text-sm text-gray-500">
                      Add every door.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addDoor}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    + Add door
                  </button>
                </div>

                <div className="space-y-4">
                  {doors.map(
                    (door, index) => (
                      <div
                        key={door.id}
                        className="rounded-xl border bg-gray-50 p-4"
                      >
                        <div className="mb-4 flex justify-between">
                          <span className="font-semibold">
                            Door {index + 1}
                          </span>

                          {doors.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeDoor(
                                  door.id
                                )
                              }
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <select
                            value={door.wall}
                            onChange={(e) =>
                              updateDoor(
                                door.id,
                                "wall",
                                e.target.value
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          >
                            <option value="north">
                              North
                            </option>
                            <option value="east">
                              East
                            </option>
                            <option value="south">
                              South
                            </option>
                            <option value="west">
                              West
                            </option>
                          </select>

                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Position"
                            value={
                              door.position
                            }
                            onChange={(e) =>
                              updateDoor(
                                door.id,
                                "position",
                                e.target.value
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          />

                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            placeholder="Width"
                            value={door.width}
                            onChange={(e) =>
                              updateDoor(
                                door.id,
                                "width",
                                e.target.value
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Windows */}
              <div>
                <div className="mb-5 flex justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Windows
                    </h2>

                    <p className="text-sm text-gray-500">
                      Add every window.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addWindow}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    + Add window
                  </button>
                </div>

                <div className="space-y-4">
                  {windows.map(
                    (window, index) => (
                      <div
                        key={window.id}
                        className="rounded-xl border bg-gray-50 p-4"
                      >
                        <div className="mb-4 flex justify-between">
                          <span className="font-semibold">
                            Window {index + 1}
                          </span>

                          {windows.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeWindow(
                                  window.id
                                )
                              }
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <select
                            value={window.wall}
                            onChange={(e) =>
                              updateWindow(
                                window.id,
                                "wall",
                                e.target.value
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          >
                            <option value="north">
                              North
                            </option>
                            <option value="east">
                              East
                            </option>
                            <option value="south">
                              South
                            </option>
                            <option value="west">
                              West
                            </option>
                          </select>

                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Position"
                            value={
                              window.position
                            }
                            onChange={(e) =>
                              updateWindow(
                                window.id,
                                "position",
                                e.target.value
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          />

                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            placeholder="Width"
                            value={
                              window.width
                            }
                            onChange={(e) =>
                              updateWindow(
                                window.id,
                                "width",
                                e.target.value
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-between border-t pt-6">
                <button
                  type="button"
                  onClick={() => goBack(1)}
                  className="rounded-xl border px-5 py-3"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-black px-6 py-3 font-semibold text-white"
                >
                  Continue →
                </button>
              </div>
            </form>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <form
              onSubmit={handleFurnitureSubmit}
            >
              <div className="mb-6 flex justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Furniture
                  </h2>

                  <p className="text-sm text-gray-500">
                    Add the furniture that needs to be placed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addFurniture}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  + Add furniture
                </button>
              </div>

              <div className="space-y-5">
                {furniture.map(
                  (item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-gray-50 p-5"
                    >
                      <div className="mb-5 flex justify-between">
                        <span className="font-semibold">
                          Furniture {index + 1}
                        </span>

                        {furniture.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeFurniture(
                                item.id
                              )
                            }
                            className="text-xs text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">

                        <select
                          value={item.type}
                          onChange={(e) =>
                            changeFurnitureType(
                              item.id,
                              e.target.value
                            )
                          }
                          className="rounded-lg border px-3 py-2 sm:col-span-2"
                        >
                          {Object.keys(
                            furniturePresets
                          ).map((type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {type}
                            </option>
                          ))}

                          <option value="Custom">
                            Custom
                          </option>
                        </select>

                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.width}
                          onChange={(e) =>
                            updateFurniture(
                              item.id,
                              "width",
                              e.target.value
                            )
                          }
                          placeholder="Width"
                          className="rounded-lg border px-3 py-2"
                        />

                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.length}
                          onChange={(e) =>
                            updateFurniture(
                              item.id,
                              "length",
                              e.target.value
                            )
                          }
                          placeholder="Length"
                          className="rounded-lg border px-3 py-2"
                        />

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateFurniture(
                              item.id,
                              "quantity",
                              e.target.value
                            )
                          }
                          placeholder="Quantity"
                          className="rounded-lg border px-3 py-2 sm:col-span-2"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>

              {error && (
                <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-between border-t pt-6">
                <button
                  type="button"
                  onClick={() => goBack(2)}
                  className="rounded-xl border px-5 py-3"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-black px-6 py-3 font-semibold text-white"
                >
                  Open Room Editor →
                </button>
              </div>
            </form>
          </section>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <section>
            <div className="mb-4 flex justify-end gap-3">
              <button type="button" onClick={showMyRooms} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium">My Rooms</button>
              <button type="button" onClick={startNewRoom} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">+ New Room</button>
            </div>
            <RoomEditor
              roomWidth={Number(
                room.width
              )}
              roomLength={Number(
                room.length
              )}
              unit={room.unit}
              doors={doors}
              windows={windows}
              furniture={furniture}
              onFurnitureChange={
                setFurniture
              }
            />

            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Layout Advisor</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Check usability, collisions, clearances and room flow. This MVP runs locally, so there is no AI API cost yet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={analyzeLayout}
                  disabled={isAnalyzing}
                  className="rounded-xl bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Layout"}
                </button>
              </div>

              {advisorResult && (
                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 p-5">
                    <div>
                      <p className="text-sm text-gray-500">Overall usability</p>
                      <p className="mt-1 text-3xl font-bold">{advisorResult.score}/100</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      Based on your current furniture arrangement
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <h3 className="font-semibold">What looks good</h3>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        {advisorResult.strengths.map((item, index) => (
                          <li key={index}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                      <h3 className="font-semibold">Suggestions</h3>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        {advisorResult.suggestions.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Save your layout
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Save the current furniture arrangement to MongoDB Atlas.
                  </p>
                </div>

                <div className="flex w-full gap-2 sm:w-auto">
                  <input
                    value={layoutName}
                    onChange={(e) =>
                      setLayoutName(
                        e.target.value
                      )
                    }
                    placeholder="Layout name"
                    maxLength={100}
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black sm:w-56"
                  />

                  <button
                    type="button"
                    onClick={handleSaveLayout}
                    disabled={isSavingLayout}
                    className="rounded-xl bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {isSavingLayout
                      ? "Saving..."
                      : "Save"}
                  </button>
                </div>
              </div>

              {success && (
                <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t pt-6">
                <div>
                  <h3 className="font-semibold">
                    Saved layouts
                  </h3>
                  <p className="text-sm text-gray-500">
                    Load an earlier arrangement whenever you want.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadSavedLayouts}
                  disabled={
                    isLoadingLayouts ||
                    !roomId
                  }
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  {isLoadingLayouts
                    ? "Loading..."
                    : "Refresh"}
                </button>
              </div>

              {savedLayouts.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  No saved layouts yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {savedLayouts.map(
                    (layout) => (
                      <div
                        key={layout.id}
                        className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {layout.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {layout.furniture.length} furniture item
                            {layout.furniture.length === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleLoadLayout(
                                layout
                              )
                            }
                            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
                          >
                            Load
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteLayout(
                                layout.id
                              )
                            }
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => goBack(3)}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium"
              >
                ← Back
              </button>

            
            </div>
          </section>
        )}

        {roomId && step === 4 && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Room ID: {roomId}
          </p>
        )}

      </div>
    </main>
  );
}