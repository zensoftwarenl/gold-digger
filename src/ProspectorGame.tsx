import { useEffect, useRef, useState } from "react";
import tilesetSrc from './Prospector-Tileset.png';
import headerImageSrc from './Prospecter-main-screen.png';

const tileSize = 32;
const mapCols = 12;
const mapRows = 12;
const canvasWidth = tileSize * mapCols;
const canvasHeight = tileSize * mapRows;
const TOTAL_GOLD_COUNT = 10; // Initial gold count

type TileType = "dirt" | "empty" | "gold";

type Position = { x: number; y: number };

const createInitialMap = (): TileType[][] => {
    // Add after createInitialMap function
    const map = Array.from({ length: mapRows }, () =>
        Array.from({ length: mapCols }, () => "dirt" as TileType)
    );

    // Place random gold nuggets
    let placed = 0;
    while (placed < TOTAL_GOLD_COUNT) {
        const row = Math.floor(Math.random() * mapRows);
        const col = Math.floor(Math.random() * mapCols);
        if (map[row][col] === "dirt") {
            map[row][col] = "gold";
            placed++;
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
    const headerCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const mapRef = useRef<TileType[][]>(createInitialMap());
    const keysPressed = useRef<Set<string>>(new Set());
    const playerRef = useRef<Position>({ x: 1, y: 1 });
    const enemiesRef = useRef<Position[]>([]);
    const runningRef = useRef(true);
    const playerFrame = useRef(0);
    const enemyFrame = useRef(0);

    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [win, setWin] = useState(false);

    const resetGame = () => {
        const newMap = createInitialMap();
        mapRef.current = newMap;
        playerRef.current = { x: 1, y: 1 };
        enemiesRef.current = [];
        setScore(0);
        setGameOver(false);
        setWin(false);
        runningRef.current = true;
    };

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

    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        let didScale = false;
        let lastMove = 0;
        let lastEnemySpawn = 0;
        let lastEnemyMove = 0;

        const handlePlayerMovement = (timestamp: number) => {
            if (timestamp - lastMove > 200) {
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
                                runningRef.current = false;
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
        };

        const handleEnemySpawning = (timestamp: number) => {
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
        };

        const handleEnemyMovement = (timestamp: number) => {
            if (timestamp - lastEnemyMove > 200) {
                enemiesRef.current = enemiesRef.current.map((enemy) => {
                    for (let attempt = 0; attempt < 3; attempt++) {
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
                    }
                    return enemy;
                });
                lastEnemyMove = timestamp;
            }
        };

        const checkEnemyCollision = () => {
            for (const enemy of enemiesRef.current) {
                if (
                    enemy.x === playerRef.current.x &&
                    enemy.y === playerRef.current.y
                ) {
                    setGameOver(true);
                    runningRef.current = false;
                }
            }
        };

        const drawMap = (ctx: CanvasRenderingContext2D) => {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            if (!imageRef.current) return;

            const tileMap = {
                dirt: { x: 0, y: 96 },
                gold: { x: 96, y: 96 },
                empty: { x: 0, y: 32 },
            };

            for (let row = 0; row < mapRows; row++) {
                for (let col = 0; col < mapCols; col++) {
                    const tile = mapRef.current[row][col];
                    const sprite = tileMap[tile];
                    ctx.drawImage(
                        imageRef.current,
                        sprite.x, sprite.y, tileSize, tileSize,
                        col * tileSize, row * tileSize, tileSize, tileSize
                    );
                }
            }
        };

        const drawEnemies = (ctx: CanvasRenderingContext2D) => {
            if (!imageRef.current) return;

            for (const enemy of enemiesRef.current) {
                const enemySprite = { x: enemyFrame.current * tileSize, y: 64 };
                ctx.drawImage(
                    imageRef.current,
                    enemySprite.x, enemySprite.y, tileSize, tileSize,
                    enemy.x * tileSize, enemy.y * tileSize, tileSize, tileSize
                );
            }
        };

        const drawPlayer = (ctx: CanvasRenderingContext2D, timestamp: number) => {
            if (!imageRef.current) return;

            // Animate player frame
            playerFrame.current = (Math.floor(timestamp / 150) % 3);

            // Animate enemy frame
            enemyFrame.current = (Math.floor(timestamp / 150) % 3);

            // Draw player
            const px = playerRef.current.x * tileSize;
            const py = playerRef.current.y * tileSize;
            const playerSprite = { x: playerFrame.current * tileSize, y: 0 };
            ctx.drawImage(
                imageRef.current,
                playerSprite.x, playerSprite.y, tileSize, tileSize,
                px, py, tileSize, tileSize
            );
        };

        const loop = (timestamp: number) => {
            if (!didScale) {
                didScale = true;
            }
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

            handlePlayerMovement(timestamp);
            handleEnemySpawning(timestamp);
            handleEnemyMovement(timestamp);
            checkEnemyCollision();

            drawMap(ctx);
            drawEnemies(ctx);
            drawPlayer(ctx, timestamp);

            if (runningRef.current) {
                requestAnimationFrame(loop);
            }
        };

        const image = new Image();
        image.src = tilesetSrc;
        image.onload = () => {
            imageRef.current = image;
            requestAnimationFrame(loop);
        };
    }, [gameOver]);

    useEffect(() => {
        const img = new Image();
        img.src = headerImageSrc;
        img.onload = () => {
            const ctx = headerCanvasRef.current?.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvasWidth, 178);
                ctx.drawImage(img, 0, 0, img.width, 178, 0, 0, canvasWidth, 178);
            }
        };
    }, []);

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
            <>
                <canvas
                    ref={headerCanvasRef}
                    width={canvasWidth}
                    height={178}
                    style={{
                        width: canvasWidth * 1.2,
                        height: 178 * 1.2,
                        imageRendering: 'pixelated',
                        display: "block",
                        margin: "auto",
                    }}
                />
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{
                        width: canvasWidth * 1.2,
                        height: canvasHeight * 1.2,
                        imageRendering: 'pixelated',
                        border: "2px solid #444",
                        background: "#000",
                        display: "block",
                        margin: "auto",
                    }}
                />
            </>
            {(gameOver || win) && (
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                    <button onClick={resetGame} style={{ padding: "0.5rem 1rem" }}>
                        Play Again
                    </button>
                </div>
            )}
        </div>
    );
};
