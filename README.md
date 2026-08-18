# AI Room Planner

An AI-powered web application that helps users design and arrange room interiors based on real-world room dimensions, doors, windows, and furniture.

The application allows users to create rooms, place and arrange furniture interactively, generate practical layout alternatives, evaluate layouts based on spatial constraints, save layouts, and receive AI-powered interior design recommendations.

The goal is to combine **geometric layout reasoning with generative AI** to help users create room arrangements that are both practical and visually appealing.

---

## Project Summary

Designing a room layout manually can be difficult when multiple constraints such as room dimensions, furniture sizes, doors, windows, and walking space need to be considered simultaneously.

AI Room Planner addresses this by providing an interactive room planning environment where users can:

- Define their room dimensions manually
- Add doors and windows
- Add furniture with dimensions
- Move and rotate furniture interactively
- Generate multiple possible layouts
- Evaluate layouts based on spatial constraints
- Save and load layouts
- Manage multiple rooms
- Ask an AI interior advisor for recommendations

The application uses a **geometry-based layout engine** for spatial calculations and an **LLM-based AI advisor** for natural-language recommendations.

---

## Tech Stack

### Frontend

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- SVG-based interactive room editor

### Backend

- **FastAPI**
- **Python**
- **Pydantic**

### Database

- **MongoDB Atlas**
- **PyMongo**

Used for storing:

- Rooms
- Saved layouts
- Furniture arrangements

### AI

- **Groq API**
- **GPT-OSS 20B**

The AI receives structured room and layout information from the backend and provides practical interior-design recommendations.

### Development

- Git
- GitHub
- VS Code

---

## Features

### 1. Room Creation

Users can create a room by manually entering:

- Room name
- Width
- Length
- Unit of measurement

---

### 2. Doors & Windows

Users can specify:

- Wall position
- Opening position
- Opening width

Doors and windows are represented directly on the room floor plan.

---

### 3. Interactive Furniture Placement

Users can add furniture with:

- Furniture type
- Width
- Length
- Quantity

Furniture can then be:

- Dragged around the room
- Selected
- Rotated by 90°
- Positioned within the room boundaries

---

### 4. Spatial Layout Validation

The application evaluates the current arrangement using a geometry engine.

It checks factors such as:

- Furniture staying inside the room
- Furniture overlap
- Door/window conflicts
- Available space
- Layout usability
- Walking space

The result is represented using a layout score and detected issues.

---

### 5. Automatic Layout Generation

The application can generate multiple possible furniture arrangements.

Generated layouts are evaluated using the spatial scoring system and presented as different layout options.

Users can select the arrangement they prefer.

---

### 6. AI Interior Advisor

The application includes an actual LLM-powered interior design advisor.

Instead of sending an image and asking an AI to guess the room geometry, the application first calculates structured spatial information.

The AI receives information such as:

- Room dimensions
- Furniture dimensions
- Furniture positions
- Furniture rotations
- Doors
- Windows
- Layout score
- Detected spatial issues

The AI then provides:

- What works well
- Potential problems
- Practical recommendations

This allows the AI to focus on **design reasoning and recommendations**, while the geometry engine handles spatial calculations.

---

### 7. Multiple Rooms

Users can create and manage multiple rooms.

Each room maintains its own:

- Dimensions
- Doors
- Windows
- Furniture arrangement
- Saved layouts

Users can switch between their rooms without losing their previous work.

---

### 8. Saved Layouts

Users can save furniture arrangements and later:

- View saved layouts
- Load a layout
- Delete a layout

Saved layouts are stored in MongoDB Atlas.

---

### 9. Persistence

Room and layout data is persisted so that users can return to their previous work.

MongoDB Atlas acts as the backend database for persistent room and layout data.

---

## User Flow

```text
Start Application
        ↓
Create Room
        ↓
Enter Room Dimensions
        ↓
Add Doors & Windows
        ↓
Add Furniture
        ↓
Open Room Editor
        ↓
Arrange / Rotate Furniture
        ↓
Validate Current Layout
        ↓
Generate Layout Alternatives
        ↓
Select Preferred Layout
        ↓
Ask AI Interior Advisor
        ↓
Receive AI Recommendations
        ↓
Save Layout
        ↓
Load / Delete Saved Layouts
        ↓
Switch Between Rooms