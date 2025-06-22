import { useEffect, useRef, useState } from "react";

const tileSize = 32;
const mapCols = 25;
const mapRows = 18;
const canvasWidth = tileSize * mapCols;
const canvasHeight = tileSize * mapRows;
let TOTAL_GOLD_COUNT = 0;

type TileType = "dirt" | "empty" | "gold";

type Position = { x: number; y: number };

const createInitialMap = (): TileType[][] => {
    // Add after createInitialMap function
    const map = Array.from({ length: mapRows }, () =>
        Array.from({ length: mapCols }, () => "dirt" as TileType)
    );

    // Place random gold nuggets
    let placed = 0;
    while (placed < 10) {
        const row = Math.floor(Math.random() * mapRows);
        const col = Math.floor(Math.random() * mapCols);
        if (map[row][col] === "dirt") {
            map[row][col] = "gold";
            placed++;
            TOTAL_GOLD_COUNT++;
        }
    }

    return map;
};

const directions: Position[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
];

export const ProspectorGame = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const mapRef = useRef<TileType[][]>(createInitialMap());
    const keysPressed = useRef<Set<string>>(new Set());
    const playerRef = useRef<Position>({ x: 1, y: 1 });
    const enemiesRef = useRef<Position[]>([]);

    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [win, setWin] = useState(false);

    // Keyboard input
    useEffect(() => {
        const down = (e: KeyboardEvent) => keysPressed.current.add(e.key);
        const up = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    // Game loop
    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        let lastMove = 0;
        let lastEnemySpawn = 0;
        let lastEnemyMove = 0;

        const loop = (timestamp: number) => {
            if (gameOver || win) {
                ctx.fillStyle = win ? "lime" : "red";
                ctx.font = "48px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(
                    win ? "YOU WIN!" : "GAME OVER",
                    canvasWidth / 2,
                    canvasHeight / 2
                );
                return;
            }
            // Handle player movement
            if (timestamp - lastMove > 120) {
                let { x, y } = playerRef.current;

                if (keysPressed.current.has("ArrowUp")) y -= 1;
                if (keysPressed.current.has("ArrowDown")) y += 1;
                if (keysPressed.current.has("ArrowLeft")) x -= 1;
                if (keysPressed.current.has("ArrowRight")) x += 1;

                x = Math.max(0, Math.min(mapCols - 1, x));
                y = Math.max(0, Math.min(mapRows - 1, y));

                const moved = x !== playerRef.current.x || y !== playerRef.current.y;
                if (moved) {
                    playerRef.current = { x, y };
                    const tile = mapRef.current[y][x];
                    if (tile === "gold") {
                        setScore((prev) => {
                            const newScore = prev + 1;
                            if (newScore === TOTAL_GOLD_COUNT) {
                                setWin(true);
                            }
                            return newScore;
                        });
                        mapRef.current[y][x] = "empty";
                    } else if (tile === "dirt") {
                        mapRef.current[y][x] = "empty";
                    }
                    lastMove = timestamp;
                }
            }

            // Spawn enemies every 4 seconds
            if (timestamp - lastEnemySpawn > 4000 && enemiesRef.current.length < 5) {
                const empties: Position[] = [];
                for (let y = 0; y < mapRows; y++) {
                    for (let x = 0; x < mapCols; x++) {
                        if (mapRef.current[y][x] === "empty") {
                            empties.push({ x, y });
                        }
                    }
                }
                if (empties.length > 0) {
                    const spawn = empties[Math.floor(Math.random() * empties.length)];
                    enemiesRef.current.push(spawn);
                }
                lastEnemySpawn = timestamp;
            }

            // Move enemies every 400ms
            if (timestamp - lastEnemyMove > 400) {
                enemiesRef.current = enemiesRef.current.map((enemy) => {
                    const shuffled = [...directions].sort(() => Math.random() - 0.5);
                    for (const dir of shuffled) {
                        const nx = enemy.x + dir.x;
                        const ny = enemy.y + dir.y;
                        if (
                            nx >= 0 &&
                            ny >= 0 &&
                            nx < mapCols &&
                            ny < mapRows &&
                            mapRef.current[ny][nx] === "empty"
                        ) {
                            return { x: nx, y: ny };
                        }
                    }
                    return enemy;
                });
                lastEnemyMove = timestamp;
            }

            // Check collision with enemies
            for (const enemy of enemiesRef.current) {
                if (
                    enemy.x === playerRef.current.x &&
                    enemy.y === playerRef.current.y
                ) {
                    setGameOver(true);
                }
            }

            // Draw map
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            for (let row = 0; row < mapRows; row++) {
                for (let col = 0; col < mapCols; col++) {
                    const tile = mapRef.current[row][col];
                    if (tile === "dirt") ctx.fillStyle = "#654321";
                    else if (tile === "gold") ctx.fillStyle = "gold";
                    else ctx.fillStyle = "#111";
                    ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                }
            }

            // Draw enemies
            for (const enemy of enemiesRef.current) {
                ctx.fillStyle = "red";
                ctx.fillRect(
                    enemy.x * tileSize + 4,
                    enemy.y * tileSize + 4,
                    tileSize - 8,
                    tileSize - 8
                );
            }

            // Draw player
            const px = playerRef.current.x * tileSize;
            const py = playerRef.current.y * tileSize;
            ctx.fillStyle = "yellow";
            ctx.fillRect(px, py, tileSize, tileSize);

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }, [gameOver]);

    return (
        <div>
            <p style={{ color: "gold", fontSize: "1.2rem", textAlign: "center" }}>
                Gold collected: {score}
            </p>
            {gameOver && (
                <p style={{ color: "red", textAlign: "center", fontSize: "1.5rem" }}>
                    You were caught! Refresh to play again.
                </p>
            )}
            {win && (
                <p style={{ color: "lime", textAlign: "center", fontSize: "1.5rem" }}>
                    You win! Refresh to play again.
                </p>
            )}
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                style={{
                    border: "2px solid #444",
                    background: "#000",
                    display: "block",
                    margin: "auto",
                }}
            />
        </div>
    );
};
