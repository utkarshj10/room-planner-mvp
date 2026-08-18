const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function checkBackendHealth(): Promise<{
  status: string;
  service: string;
}> {
  const response = await fetch(`${API_URL}/api/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}

export async function createRoom(room: unknown) {
  const response = await fetch(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(room),
  });

  if (!response.ok) {
    throw new Error("Could not create room");
  }

  return response.json();
}
