export type Wall =
  | "north"
  | "east"
  | "south"
  | "west";

export type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FurnitureGeometry = {
  id: number;
  type: string;
  x: number;
  y: number;
  width: number;
  length: number;
  rotation: number;
};

export type Opening = {
  wall: Wall;
  position: number;
  width: number;
};

export type LayoutIssue = {
  furnitureId: number;
  type:
    | "boundary"
    | "furniture_collision"
    | "door_collision"
    | "window_collision"
    | "clearance";
  message: string;
};

export type LayoutResult = {
  score: number;
  issues: LayoutIssue[];
  valid: boolean;
};

export type GeneratedLayout = {
  furniture: FurnitureGeometry[];
  score: number;
};

/* =========================================================
   BASIC GEOMETRY
   ========================================================= */

export function getFurnitureRectangle(
  furniture: FurnitureGeometry
): Rectangle {
  const rotated =
    furniture.rotation % 180 !== 0;

  return {
    x: Number(furniture.x),
    y: Number(furniture.y),
    width: rotated
      ? Number(furniture.length)
      : Number(furniture.width),
    height: rotated
      ? Number(furniture.width)
      : Number(furniture.length),
  };
}

export function rectanglesOverlap(
  a: Rectangle,
  b: Rectangle,
  padding = 0
): boolean {
  return (
    a.x < b.x + b.width + padding &&
    a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding &&
    a.y + a.height + padding > b.y
  );
}

export function isInsideRoom(
  rectangle: Rectangle,
  roomWidth: number,
  roomLength: number
): boolean {
  return (
    rectangle.x >= 0 &&
    rectangle.y >= 0 &&
    rectangle.x + rectangle.width <=
      roomWidth &&
    rectangle.y + rectangle.height <=
      roomLength
  );
}

function rectangleDistance(
  a: Rectangle,
  b: Rectangle
): number {
  const horizontal = Math.max(
    0,
    Math.max(
      a.x - (b.x + b.width),
      b.x - (a.x + a.width)
    )
  );

  const vertical = Math.max(
    0,
    Math.max(
      a.y - (b.y + b.height),
      b.y - (a.y + a.height)
    )
  );

  return Math.sqrt(
    horizontal * horizontal +
      vertical * vertical
  );
}

/* =========================================================
   OPENING GEOMETRY
   ========================================================= */

function openingToRectangle(
  opening: Opening,
  roomWidth: number,
  roomLength: number,
  clearance = 0
): Rectangle {
  const position = Number(opening.position);
  const width = Number(opening.width);

  switch (opening.wall) {
    case "north":
      return {
        x: position - clearance,
        y: 0,
        width: width + clearance * 2,
        height: 0.1 + clearance,
      };

    case "south":
      return {
        x: position - clearance,
        y:
          roomLength -
          0.1 -
          clearance,
        width: width + clearance * 2,
        height: 0.1 + clearance,
      };

    case "west":
      return {
        x: 0,
        y: position - clearance,
        width: 0.1 + clearance,
        height: width + clearance * 2,
      };

    case "east":
      return {
        x:
          roomWidth -
          0.1 -
          clearance,
        y: position - clearance,
        width: 0.1 + clearance,
        height: width + clearance * 2,
      };
  }
}

/* =========================================================
   RANDOM HELPER
   ========================================================= */

function seededRandom(
  seed: number
): number {
  const value =
    Math.sin(seed * 12.9898) *
    43758.5453;

  return value -
    Math.floor(value);
}

/* =========================================================
   CANDIDATE POSITIONS
   ========================================================= */

function getCandidatePositions(
  width: number,
  height: number,
  roomWidth: number,
  roomLength: number,
  seed: number
): Array<{
  x: number;
  y: number;
}> {
  const positions: Array<{
    x: number;
    y: number;
  }> = [];

  /*
   * Use a 0.5m grid.
   */
  for (
    let y = 0;
    y <= roomLength - height;
    y += 0.5
  ) {
    for (
      let x = 0;
      x <= roomWidth - width;
      x += 0.5
    ) {
      positions.push({
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      });
    }
  }

  /*
   * Shuffle differently for each
   * candidate layout.
   */
  for (
    let i = positions.length - 1;
    i > 0;
    i--
  ) {
    const random =
      seededRandom(seed + i * 17);

    const j = Math.floor(
      random * (i + 1)
    );

    [
      positions[i],
      positions[j],
    ] = [
      positions[j],
      positions[i],
    ];
  }

  return positions;
}

/* =========================================================
   BASIC VALIDATION
   ========================================================= */

function isValidPlacement(
  furniture: FurnitureGeometry,
  placed: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): boolean {
  const rectangle =
    getFurnitureRectangle(
      furniture
    );

  /*
   * 1. Stay inside room.
   */
  if (
    !isInsideRoom(
      rectangle,
      roomWidth,
      roomLength
    )
  ) {
    return false;
  }

  /*
   * 2. Don't overlap furniture.
   */
  for (const existing of placed) {
    if (
      rectanglesOverlap(
        rectangle,
        getFurnitureRectangle(
          existing
        ),
        0.1
      )
    ) {
      return false;
    }
  }

  /*
   * 3. Keep door area clear.
   */
  for (const door of doors) {
    const doorZone =
      openingToRectangle(
        door,
        roomWidth,
        roomLength,
        0.75
      );

    if (
      rectanglesOverlap(
        rectangle,
        doorZone
      )
    ) {
      return false;
    }
  }

  /*
   * 4. Keep window area reasonably clear.
   *
   * This is intentionally simple.
   * No special wardrobe/bed rules.
   */
  for (const window of windows) {
    const windowZone =
      openingToRectangle(
        window,
        roomWidth,
        roomLength,
        0.5
      );

    if (
      rectanglesOverlap(
        rectangle,
        windowZone
      )
    ) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   GRID PATHFINDING
   ========================================================= */

type GridPoint = {
  x: number;
  y: number;
};

function pointToGrid(
  x: number,
  y: number,
  cellSize: number
): GridPoint {
  return {
    x: Math.floor(
      x / cellSize
    ),
    y: Math.floor(
      y / cellSize
    ),
  };
}

function gridToPoint(
  x: number,
  y: number,
  cellSize: number
): {
  x: number;
  y: number;
} {
  return {
    x:
      x * cellSize +
      cellSize / 2,

    y:
      y * cellSize +
      cellSize / 2,
  };
}

function isBlocked(
  gx: number,
  gy: number,
  furniture: FurnitureGeometry[],
  roomWidth: number,
  roomLength: number,
  cellSize: number
): boolean {
  const point =
    gridToPoint(
      gx,
      gy,
      cellSize
    );

  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x >= roomWidth ||
    point.y >= roomLength
  ) {
    return true;
  }

  /*
   * Furniture plus walking clearance.
   */
  for (const item of furniture) {
    const rectangle =
      getFurnitureRectangle(
        item
      );

    const clearance = 0.35;

    const expanded = {
      x:
        rectangle.x -
        clearance,

      y:
        rectangle.y -
        clearance,

      width:
        rectangle.width +
        clearance * 2,

      height:
        rectangle.height +
        clearance * 2,
    };

    if (
      point.x >= expanded.x &&
      point.x <=
        expanded.x +
          expanded.width &&
      point.y >= expanded.y &&
      point.y <=
        expanded.y +
          expanded.height
    ) {
      return true;
    }
  }

  return false;
}

function findPath(
  start: GridPoint,
  target: GridPoint,
  furniture: FurnitureGeometry[],
  roomWidth: number,
  roomLength: number,
  cellSize: number
): boolean {
  const columns = Math.ceil(
    roomWidth / cellSize
  );

  const rows = Math.ceil(
    roomLength / cellSize
  );

  const startX = Math.max(
    0,
    Math.min(
      columns - 1,
      start.x
    )
  );

  const startY = Math.max(
    0,
    Math.min(
      rows - 1,
      start.y
    )
  );

  const targetX = Math.max(
    0,
    Math.min(
      columns - 1,
      target.x
    )
  );

  const targetY = Math.max(
    0,
    Math.min(
      rows - 1,
      target.y
    )
  );

  const queue: GridPoint[] = [
    {
      x: startX,
      y: startY,
    },
  ];

  const visited =
    new Set<string>();

  visited.add(
    `${startX},${startY}`
  );

  let index = 0;

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (
    index < queue.length
  ) {
    const current =
      queue[index++];

    if (
      current.x === targetX &&
      current.y === targetY
    ) {
      return true;
    }

    for (
      const direction of directions
    ) {
      const nextX =
        current.x +
        direction.x;

      const nextY =
        current.y +
        direction.y;

      if (
        nextX < 0 ||
        nextY < 0 ||
        nextX >= columns ||
        nextY >= rows
      ) {
        continue;
      }

      const key =
        `${nextX},${nextY}`;

      if (
        visited.has(key)
      ) {
        continue;
      }

      if (
        isBlocked(
          nextX,
          nextY,
          furniture,
          roomWidth,
          roomLength,
          cellSize
        )
      ) {
        continue;
      }

      visited.add(key);

      queue.push({
        x: nextX,
        y: nextY,
      });
    }
  }

  return false;
}

/* =========================================================
   MOVEMENT CHECK
   ========================================================= */

function hasUsableMovement(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  roomWidth: number,
  roomLength: number
): boolean {
  /*
   * If there is no door entered,
   * don't reject the layout.
   */
  if (doors.length === 0) {
    return true;
  }

  const cellSize = 0.5;

  /*
   * The center of the room should be
   * reachable from every door.
   */
  const target =
    pointToGrid(
      roomWidth / 2,
      roomLength / 2,
      cellSize
    );

  for (const door of doors) {
    const doorCenter =
      Number(door.position) +
      Number(door.width) / 2;

    let startX = 0;
    let startY = 0;

    switch (door.wall) {
      case "north":
        startX = doorCenter;
        startY = cellSize;
        break;

      case "south":
        startX = doorCenter;
        startY =
          roomLength -
          cellSize;
        break;

      case "west":
        startX = cellSize;
        startY = doorCenter;
        break;

      case "east":
        startX =
          roomWidth -
          cellSize;
        startY = doorCenter;
        break;
    }

    const start =
      pointToGrid(
        startX,
        startY,
        cellSize
      );

    const reachable =
      findPath(
        start,
        target,
        furniture,
        roomWidth,
        roomLength,
        cellSize
      );

    if (!reachable) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   PLACEMENT QUALITY
   ========================================================= */

function placementScore(
  furniture: FurnitureGeometry[],
  roomWidth: number,
  roomLength: number,
  windows: Opening[]
): number {
  let score = 0;

  /*
   * Reward furniture being reasonably
   * close to walls.
   */
  for (const item of furniture) {
    const rectangle =
      getFurnitureRectangle(
        item
      );

    const left =
      rectangle.x;

    const right =
      roomWidth -
      rectangle.x -
      rectangle.width;

    const top =
      rectangle.y;

    const bottom =
      roomLength -
      rectangle.y -
      rectangle.height;

    const nearestWall =
      Math.min(
        left,
        right,
        top,
        bottom
      );

    score += Math.max(
      0,
      8 -
        nearestWall * 2
    );
  }

  /*
   * Reward spacing.
   */
  for (
    let i = 0;
    i < furniture.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < furniture.length;
      j++
    ) {
      const distance =
        rectangleDistance(
          getFurnitureRectangle(
            furniture[i]
          ),
          getFurnitureRectangle(
            furniture[j]
          )
        );

      if (
        distance >= 1.5
      ) {
        score += 4;
      } else if (
        distance >= 0.75
      ) {
        score += 1;
      } else {
        score -= 4;
      }
    }
  }

  /*
   * Reward an open center.
   */
  const centerZone = {
    x:
      roomWidth / 2 -
      Math.min(
        roomWidth * 0.15,
        1.5
      ),

    y:
      roomLength / 2 -
      Math.min(
        roomLength * 0.15,
        1.5
      ),

    width:
      Math.min(
        roomWidth * 0.3,
        3
      ),

    height:
      Math.min(
        roomLength * 0.3,
        3
      ),
  };

  let centerBlocked = false;

  for (const item of furniture) {
    if (
      rectanglesOverlap(
        getFurnitureRectangle(
          item
        ),
        centerZone
      )
    ) {
      centerBlocked = true;
      break;
    }
  }

  if (!centerBlocked) {
    score += 15;
  }

  /*
   * Very small bonus for desks near
   * windows, but this is NOT a hard rule.
   */
  for (const item of furniture) {
    if (
      !item.type
        .toLowerCase()
        .includes("desk")
    ) {
      continue;
    }

    const rectangle =
      getFurnitureRectangle(
        item
      );

    const centerX =
      rectangle.x +
      rectangle.width / 2;

    const centerY =
      rectangle.y +
      rectangle.height / 2;

    for (const window of windows) {
      const windowCenter =
        Number(window.position) +
        Number(window.width) / 2;

      let distance = Infinity;

      switch (window.wall) {
        case "north":
          distance =
            Math.abs(
              centerX -
                windowCenter
            ) +
            centerY;
          break;

        case "south":
          distance =
            Math.abs(
              centerX -
                windowCenter
            ) +
            (
              roomLength -
              centerY
            );
          break;

        case "west":
          distance =
            Math.abs(
              centerY -
                windowCenter
            ) +
            centerX;
          break;

        case "east":
          distance =
            Math.abs(
              centerY -
                windowCenter
            ) +
            (
              roomWidth -
              centerX
            );
          break;
      }

      if (
        distance < 2.5
      ) {
        score += 5;
      }
    }
  }

  return score;
}

/* =========================================================
   LAYOUT DIFFERENCE
   ========================================================= */

function layoutDifference(
  a: FurnitureGeometry[],
  b: FurnitureGeometry[]
): number {
  let total = 0;
  let count = 0;

  for (const itemA of a) {
    const itemB =
      b.find(
        (item) =>
          item.id === itemA.id
      );

    if (!itemB) {
      continue;
    }

    const aRect =
      getFurnitureRectangle(
        itemA
      );

    const bRect =
      getFurnitureRectangle(
        itemB
      );

    const ax =
      aRect.x +
      aRect.width / 2;

    const ay =
      aRect.y +
      aRect.height / 2;

    const bx =
      bRect.x +
      bRect.width / 2;

    const by =
      bRect.y +
      bRect.height / 2;

    total += Math.sqrt(
      (ax - bx) ** 2 +
        (ay - by) ** 2
    );

    if (
      itemA.rotation !==
      itemB.rotation
    ) {
      total += 1;
    }

    count++;
  }

  return count === 0
    ? 0
    : total / count;
}

/* =========================================================
   GENERATE ONE LAYOUT
   ========================================================= */

function generateCandidate(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number,
  seed: number
): FurnitureGeometry[] | null {
  const placed: FurnitureGeometry[] =
    [];

  /*
   * Put larger furniture first.
   */
  const sorted =
    [...furniture].sort(
      (a, b) =>
        b.width * b.length -
        a.width * a.length
    );

  for (
    let itemIndex = 0;
    itemIndex < sorted.length;
    itemIndex++
  ) {
    const item =
      sorted[itemIndex];

    /*
     * Alternate which orientation
     * gets preference.
     */
    const rotations =
      seed % 2 === 0
        ? [0, 90]
        : [90, 0];

    let best:
      FurnitureGeometry | null =
      null;

    let bestScore =
      -Infinity;

    for (
      let rotationIndex = 0;
      rotationIndex <
      rotations.length;
      rotationIndex++
    ) {
      const rotation =
        rotations[rotationIndex];

      const width =
        rotation % 180 === 0
          ? item.width
          : item.length;

      const height =
        rotation % 180 === 0
          ? item.length
          : item.width;

      if (
        width > roomWidth ||
        height > roomLength
      ) {
        continue;
      }

      const positions =
        getCandidatePositions(
          width,
          height,
          roomWidth,
          roomLength,
          seed +
            itemIndex * 100 +
            rotationIndex * 1000
        );

      /*
       * Check enough positions to find
       * a good arrangement without making
       * generation unnecessarily slow.
       */
      const limit =
        Math.min(
          positions.length,
          500
        );

      for (
        let i = 0;
        i < limit;
        i++
      ) {
        const position =
          positions[i];

        const candidate: FurnitureGeometry =
          {
            ...item,
            x: position.x,
            y: position.y,
            rotation,
          };

        if (
          !isValidPlacement(
            candidate,
            placed,
            doors,
            windows,
            roomWidth,
            roomLength
          )
        ) {
          continue;
        }

        let score =
          seededRandom(
            seed * 10000 +
              i * 17 +
              itemIndex * 31
          ) * 5;

        /*
         * Prefer useful spacing.
         */
        for (
          const existing of placed
        ) {
          const distance =
            rectangleDistance(
              getFurnitureRectangle(
                candidate
              ),
              getFurnitureRectangle(
                existing
              )
            );

          if (
            distance >= 1.5
          ) {
            score += 4;
          } else if (
            distance >= 0.75
          ) {
            score += 1;
          } else {
            score -= 5;
          }
        }

        /*
         * Keep the center somewhat open.
         */
        const rectangle =
          getFurnitureRectangle(
            candidate
          );

        const centerX =
          roomWidth / 2;

        const centerY =
          roomLength / 2;

        const itemCenterX =
          rectangle.x +
          rectangle.width / 2;

        const itemCenterY =
          rectangle.y +
          rectangle.height / 2;

        const distanceFromCenter =
          Math.sqrt(
            (
              itemCenterX -
              centerX
            ) ** 2 +
              (
                itemCenterY -
                centerY
            ) ** 2
          );

        score +=
          distanceFromCenter;

        if (
          score > bestScore
        ) {
          bestScore = score;
          best = candidate;
        }
      }
    }

    /*
     * Couldn't place this furniture.
     */
    if (!best) {
      return null;
    }

    placed.push(best);
  }

  /*
   * Final movement check.
   */
  if (
    !hasUsableMovement(
      placed,
      doors,
      roomWidth,
      roomLength
    )
  ) {
    return null;
  }

  return placed;
}

/* =========================================================
   FINAL SCORE
   ========================================================= */

function scoreLayout(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): number {
  const analysis =
    calculateLayout(
      furniture,
      doors,
      windows,
      roomWidth,
      roomLength
    );

  if (!analysis.valid) {
    return -Infinity;
  }

  if (
    !hasUsableMovement(
      furniture,
      doors,
      roomWidth,
      roomLength
    )
  ) {
    return -Infinity;
  }

  let score = 60;

  score += placementScore(
    furniture,
    roomWidth,
    roomLength,
    windows
  );

  /*
   * Small bonus for having a valid
   * movement path.
   */
  score += 15;

  /*
   * Penalize tight furniture spacing.
   */
  for (
    let i = 0;
    i < furniture.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < furniture.length;
      j++
    ) {
      const distance =
        rectangleDistance(
          getFurnitureRectangle(
            furniture[i]
          ),
          getFurnitureRectangle(
            furniture[j]
          )
        );

      if (
        distance < 0.75
      ) {
        score -= 8;
      }
    }
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

/* =========================================================
   PUBLIC: GENERATE 3 LAYOUTS
   ========================================================= */

export function generateLayouts(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): GeneratedLayout[] {
  if (
    furniture.length === 0 ||
    roomWidth <= 0 ||
    roomLength <= 0
  ) {
    return [];
  }

  const candidates:
    GeneratedLayout[] = [];

  /*
   * Generate 40 possible layouts.
   *
   * This is completely local.
   */
  for (
    let seed = 1;
    seed <= 40;
    seed++
  ) {
    const layout =
      generateCandidate(
        furniture,
        doors,
        windows,
        roomWidth,
        roomLength,
        seed
      );

    if (!layout) {
      continue;
    }

    const score =
      scoreLayout(
        layout,
        doors,
        windows,
        roomWidth,
        roomLength
      );

    if (
      !Number.isFinite(score)
    ) {
      continue;
    }

    candidates.push({
      furniture: layout,
      score,
    });
  }

  /*
   * Best layouts first.
   */
  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  /*
   * Select genuinely different layouts.
   */
  const selected:
    GeneratedLayout[] = [];

  for (
    const candidate of candidates
  ) {
    let tooSimilar = false;

    for (
      const existing of selected
    ) {
      const difference =
        layoutDifference(
          existing.furniture,
          candidate.furniture
        );

      /*
       * Require at least ~2m average
       * movement difference between
       * layouts.
       */
      if (
        difference < 2
      ) {
        tooSimilar = true;
        break;
      }
    }

    if (tooSimilar) {
      continue;
    }

    selected.push(candidate);

    if (
      selected.length === 3
    ) {
      break;
    }
  }

  /*
   * If the room is small and we couldn't
   * find three sufficiently different
   * layouts, fill remaining slots with
   * the next best valid candidates.
   */
  if (
    selected.length < 3
  ) {
    for (
      const candidate of candidates
    ) {
      if (
        selected.includes(
          candidate
        )
      ) {
        continue;
      }

      selected.push(candidate);

      if (
        selected.length === 3
      ) {
        break;
      }
    }
  }

  return selected;
}

/* =========================================================
   BACKWARDS COMPATIBILITY
   ========================================================= */

export function generateLayout(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): FurnitureGeometry[] {
  const layouts =
    generateLayouts(
      furniture,
      doors,
      windows,
      roomWidth,
      roomLength
    );

  return (
    layouts[0]?.furniture ??
    furniture
  );
}

/* =========================================================
   MANUAL LAYOUT ANALYSIS
   ========================================================= */

export function calculateLayout(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): LayoutResult {
  const issues: LayoutIssue[] =
    [];

  const rectangles =
    furniture.map(
      (item) => ({
        item,
        rectangle:
          getFurnitureRectangle(
            item
          ),
      })
    );

  /*
   * Boundary checks.
   */
  for (
    const {
      item,
      rectangle,
    } of rectangles
  ) {
    if (
      !isInsideRoom(
        rectangle,
        roomWidth,
        roomLength
      )
    ) {
      issues.push({
        furnitureId: item.id,
        type: "boundary",
        message:
          `${item.type} is outside the room boundary.`,
      });
    }
  }

  /*
   * Furniture collisions.
   */
  for (
    let i = 0;
    i < rectangles.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < rectangles.length;
      j++
    ) {
      if (
        rectanglesOverlap(
          rectangles[i].rectangle,
          rectangles[j].rectangle
        )
      ) {
        issues.push({
          furnitureId:
            rectangles[i].item.id,

          type:
            "furniture_collision",

          message:
            `${rectangles[i].item.type} overlaps ${rectangles[j].item.type}.`,
        });

        issues.push({
          furnitureId:
            rectangles[j].item.id,

          type:
            "furniture_collision",

          message:
            `${rectangles[j].item.type} overlaps ${rectangles[i].item.type}.`,
        });
      }
    }
  }

  /*
   * Door checks.
   */
  for (
    const {
      item,
      rectangle,
    } of rectangles
  ) {
    for (
      const door of doors
    ) {
      const doorZone =
        openingToRectangle(
          door,
          roomWidth,
          roomLength,
          0.1
        );

      if (
        rectanglesOverlap(
          rectangle,
          doorZone
        )
      ) {
        issues.push({
          furnitureId: item.id,

          type:
            "door_collision",

          message:
            `${item.type} is blocking a door.`,
        });
      }
    }
  }

  /*
   * Window checks.
   */
  for (
    const {
      item,
      rectangle,
    } of rectangles
  ) {
    for (
      const window of windows
    ) {
      const windowZone =
        openingToRectangle(
          window,
          roomWidth,
          roomLength,
          0.5
        );

      if (
        rectanglesOverlap(
          rectangle,
          windowZone
        )
      ) {
        issues.push({
          furnitureId: item.id,

          type:
            "window_collision",

          message:
            `${item.type} is blocking a window.`,
        });
      }
    }
  }

  /*
   * Clearance warnings.
   */
  for (
    let i = 0;
    i < rectangles.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < rectangles.length;
      j++
    ) {
      const distance =
        rectangleDistance(
          rectangles[i].rectangle,
          rectangles[j].rectangle
        );

      if (
        distance < 1
      ) {
        issues.push({
          furnitureId:
            rectangles[i].item.id,

          type:
            "clearance",

          message:
            `There may not be enough walking space between ${rectangles[i].item.type} and ${rectangles[j].item.type}.`,
        });
      }
    }
  }

  /*
   * Score.
   */
  let score = 100;

  for (
    const issue of issues
  ) {
    switch (issue.type) {
      case "boundary":
        score -= 40;
        break;

      case "furniture_collision":
        score -= 35;
        break;

      case "door_collision":
        score -= 40;
        break;

      case "window_collision":
        score -= 30;
        break;

      case "clearance":
        score -= 8;
        break;
    }
  }

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    score,
    issues,

    valid:
      !issues.some(
        (issue) =>
          issue.type ===
            "boundary" ||
          issue.type ===
            "furniture_collision" ||
          issue.type ===
            "door_collision" ||
          issue.type ===
            "window_collision"
      ),
  };
}