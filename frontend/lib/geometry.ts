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

export function getFurnitureRectangle(
  furniture: FurnitureGeometry
): Rectangle {
  const width = Number(furniture.width);
  const length = Number(furniture.length);

  const rotated =
    furniture.rotation % 180 !== 0;

  return {
    x: Number(furniture.x),
    y: Number(furniture.y),
    width: rotated ? length : width,
    height: rotated ? width : length,
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
  const epsilon = 0.001;

  return (
    rectangle.x >= -epsilon &&
    rectangle.y >= -epsilon &&
    rectangle.x + rectangle.width <=
      roomWidth + epsilon &&
    rectangle.y + rectangle.height <=
      roomLength + epsilon
  );
}

/*
 * Convert a door/window into a rectangle.
 *
 * The opening itself is small, but we also use
 * an additional clearance zone when generating
 * layouts.
 */
function openingToRectangle(
  opening: Opening,
  roomWidth: number,
  roomLength: number,
  extraClearance = 0
): Rectangle {
  const wallThickness = 0.05;

  const position = Number(
    opening.position
  );

  const width = Number(
    opening.width
  );

  switch (opening.wall) {
    case "north":
      return {
        x: position - extraClearance,
        y: 0,
        width:
          width +
          extraClearance * 2,
        height:
          wallThickness +
          extraClearance,
      };

    case "south":
      return {
        x: position - extraClearance,
        y:
          roomLength -
          wallThickness -
          extraClearance,
        width:
          width +
          extraClearance * 2,
        height:
          wallThickness +
          extraClearance,
      };

    case "east":
      return {
        x:
          roomWidth -
          wallThickness -
          extraClearance,
        y: position - extraClearance,
        width:
          wallThickness +
          extraClearance,
        height:
          width +
          extraClearance * 2,
      };

    case "west":
      return {
        x: 0,
        y: position - extraClearance,
        width:
          wallThickness +
          extraClearance,
        height:
          width +
          extraClearance * 2,
      };
  }
}

export function calculateLayout(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): LayoutResult {
  const issues: LayoutIssue[] = [];

  const rectangles = furniture.map(
    (item) => ({
      item,
      rectangle:
        getFurnitureRectangle(item),
    })
  );

  /*
   * 1. Boundary
   */
  for (const {
    item,
    rectangle,
  } of rectangles) {
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
        message: `${item.type} is outside the room boundary.`,
      });
    }
  }

  /*
   * 2. Furniture collision
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
      const first = rectangles[i];
      const second = rectangles[j];

      if (
        rectanglesOverlap(
          first.rectangle,
          second.rectangle
        )
      ) {
        issues.push({
          furnitureId:
            first.item.id,
          type:
            "furniture_collision",
          message: `${first.item.type} overlaps ${second.item.type}.`,
        });

        issues.push({
          furnitureId:
            second.item.id,
          type:
            "furniture_collision",
          message: `${second.item.type} overlaps ${first.item.type}.`,
        });
      }
    }
  }

  /*
   * 3. Door collision
   */
  for (const {
    item,
    rectangle,
  } of rectangles) {
    for (const door of doors) {
      const doorRectangle =
        openingToRectangle(
          door,
          roomWidth,
          roomLength
        );

      if (
        rectanglesOverlap(
          rectangle,
          doorRectangle,
          0.05
        )
      ) {
        issues.push({
          furnitureId: item.id,
          type: "door_collision",
          message: `${item.type} is blocking a door.`,
        });
      }
    }
  }

  /*
   * 4. Window collision
   */
  for (const {
    item,
    rectangle,
  } of rectangles) {
    for (const window of windows) {
      const windowRectangle =
        openingToRectangle(
          window,
          roomWidth,
          roomLength
        );

      if (
        rectanglesOverlap(
          rectangle,
          windowRectangle,
          0.05
        )
      ) {
        issues.push({
          furnitureId: item.id,
          type: "window_collision",
          message: `${item.type} is blocking a window.`,
        });
      }
    }
  }

  /*
   * 5. Walking clearance
   */
  const walkingClearance = 1.5;

  for (
    let i = 0;
    i < rectangles.length;
    i++
  ) {
    const current = rectangles[i];

    const expanded = {
      x:
        current.rectangle.x -
        walkingClearance,
      y:
        current.rectangle.y -
        walkingClearance,
      width:
        current.rectangle.width +
        walkingClearance * 2,
      height:
        current.rectangle.height +
        walkingClearance * 2,
    };

    for (
      let j = 0;
      j < rectangles.length;
      j++
    ) {
      if (i === j) {
        continue;
      }

      if (
        rectanglesOverlap(
          expanded,
          rectangles[j].rectangle
        )
      ) {
        issues.push({
          furnitureId:
            current.item.id,
          type: "clearance",
          message: `There may not be enough walking space around ${current.item.type}.`,
        });

        break;
      }
    }
  }

  /*
   * Score
   */
  let score = 100;

  for (const issue of issues) {
    switch (issue.type) {
      case "boundary":
        score -= 30;
        break;

      case "furniture_collision":
        score -= 25;
        break;

      case "door_collision":
        score -= 30;
        break;

      case "window_collision":
        score -= 20;
        break;

      case "clearance":
        score -= 5;
        break;
    }
  }

  score = Math.max(
    0,
    Math.min(100, score)
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

/*
 * Automatic layout generator
 */
export function generateLayout(
  furniture: FurnitureGeometry[],
  doors: Opening[],
  windows: Opening[],
  roomWidth: number,
  roomLength: number
): FurnitureGeometry[] {
  const placed: FurnitureGeometry[] = [];

  /*
   * Larger furniture gets priority.
   */
  const sorted = [...furniture].sort(
    (a, b) => {
      const areaA =
        Number(a.width) *
        Number(a.length);

      const areaB =
        Number(b.width) *
        Number(b.length);

      return areaB - areaA;
    }
  );

  /*
   * Generate one item at a time.
   */
  for (const item of sorted) {
    let bestCandidate:
      | FurnitureGeometry
      | null = null;

    let bestScore = -Infinity;

    const rotations = [0, 90];

    for (const rotation of rotations) {
      const baseWidth =
        Number(item.width);

      const baseLength =
        Number(item.length);

      const width =
        rotation % 180 === 0
          ? baseWidth
          : baseLength;

      const height =
        rotation % 180 === 0
          ? baseLength
          : baseWidth;

      /*
       * Furniture physically cannot fit.
       */
      if (
        width >
          roomWidth ||
        height >
          roomLength
      ) {
        continue;
      }

      /*
       * Search positions.
       *
       * 0.5-unit grid keeps the search
       * reasonably fast.
       */
      for (
        let y = 0;
        y <=
          roomLength -
            height;
        y += 0.5
      ) {
        for (
          let x = 0;
          x <=
            roomWidth -
              width;
          x += 0.5
        ) {
          const candidate: FurnitureGeometry =
            {
              ...item,

              x: Number(
                x.toFixed(2)
              ),

              y: Number(
                y.toFixed(2)
              ),

              rotation,
            };

          const rectangle =
            getFurnitureRectangle(
              candidate
            );

          /*
           * HARD RULE 1:
           * Must be completely inside room.
           */
          if (
            !isInsideRoom(
              rectangle,
              roomWidth,
              roomLength
            )
          ) {
            continue;
          }

          /*
           * HARD RULE 2:
           * Cannot overlap already placed
           * furniture.
           */
          let collision = false;

          for (
            const existing of placed
          ) {
            const existingRectangle =
              getFurnitureRectangle(
                existing
              );

            if (
              rectanglesOverlap(
                rectangle,
                existingRectangle,
                0.05
              )
            ) {
              collision = true;
              break;
            }
          }

          if (collision) {
            continue;
          }

          /*
           * HARD RULE 3:
           * Doors need clearance.
           *
           * We use 1 ft around doors.
           */
          let blocksDoor = false;

          for (
            const door of doors
          ) {
            const doorZone =
              openingToRectangle(
                door,
                roomWidth,
                roomLength,
                1
              );

            if (
              rectanglesOverlap(
                rectangle,
                doorZone
              )
            ) {
              blocksDoor = true;
              break;
            }
          }

          if (blocksDoor) {
            continue;
          }

          /*
           * HARD RULE 4:
           * Windows need clearance.
           *
           * We use 0.5 ft in front
           * of the window.
           */
          let blocksWindow = false;

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
              blocksWindow = true;
              break;
            }
          }

          if (blocksWindow) {
            continue;
          }

          /*
           * Candidate is physically valid.
           *
           * Now score its quality.
           */
          let candidateScore = 0;

          /*
           * Prefer furniture against walls.
           */
          const wallDistance =
            Math.min(
              x,
              y,
              roomWidth -
                (x + width),
              roomLength -
                (y + height)
            );

          candidateScore +=
            Math.max(
              0,
              20 -
                wallDistance * 3
            );

          /*
           * Penalize positions too close
           * to existing furniture.
           */
          for (
            const existing of placed
          ) {
            const existingRectangle =
              getFurnitureRectangle(
                existing
              );

            const clearanceZone = {
              x:
                existingRectangle.x -
                1.5,

              y:
                existingRectangle.y -
                1.5,

              width:
                existingRectangle.width +
                3,

              height:
                existingRectangle.height +
                3,
            };

            if (
              rectanglesOverlap(
                rectangle,
                clearanceZone
              )
            ) {
              candidateScore -=
                15;
            }
          }

          /*
           * Prefer positions that leave
           * the center of the room open.
           */
          const centerX =
            roomWidth / 2;

          const centerY =
            roomLength / 2;

          const furnitureCenterX =
            x + width / 2;

          const furnitureCenterY =
            y + height / 2;

          const distanceFromCenter =
            Math.sqrt(
              Math.pow(
                furnitureCenterX -
                  centerX,
                2
              ) +
                Math.pow(
                  furnitureCenterY -
                    centerY,
                  2
                )
            );

          candidateScore +=
            distanceFromCenter;

          /*
           * Prefer horizontal/vertical
           * alignment with walls.
           */
          if (
            x < 0.5 ||
            roomWidth -
              (x + width) <
              0.5
          ) {
            candidateScore += 5;
          }

          if (
            y < 0.5 ||
            roomLength -
              (y + height) <
              0.5
          ) {
            candidateScore += 5;
          }

          if (
            candidateScore >
            bestScore
          ) {
            bestScore =
              candidateScore;

            bestCandidate =
              candidate;
          }
        }
      }
    }

    /*
     * IMPORTANT:
     *
     * Never intentionally add an invalid
     * furniture position.
     */
    if (bestCandidate) {
      placed.push(
        bestCandidate
      );
    }
  }

  /*
   * Return the original furniture order.
   *
   * If an item genuinely couldn't fit,
   * we return it unchanged. The editor
   * will then show that item as invalid,
   * rather than pretending the generated
   * layout is valid.
   */
  return furniture.map(
    (original) => {
      const generated =
        placed.find(
          (item) =>
            item.id ===
            original.id
        );

      return (
        generated ?? original
      );
    }
  );
}