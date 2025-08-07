import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type GameState = 'start' | 'playing' | 'gameOver';

interface CirclePosition {
  id: number;
  angle: number;
  speed: number;
}

const GAME_CONFIG = {
  CORE_RADIUS: 60,
  ORBIT_RADIUS: 120,
  CIRCLE_SIZE: 16,
  HIT_ZONE_ANGLE: 30, // degrees
  HIT_ZONE_POSITION: 0, // degrees (top of circle)
  INITIAL_SPEED: 1, // degrees per frame
  SPEED_INCREMENT: 0.1,
  MAX_CIRCLES: 1,
};

export default function CircleReflexGame() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('circle-reflex-high-score');
    return saved ? parseInt(saved) : 0;
  });
  const [circles, setCircles] = useState<CirclePosition[]>([]);
  const [gameSpeed, setGameSpeed] = useState(GAME_CONFIG.INITIAL_SPEED);
  const animationRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Initialize circles
  const initializeGame = useCallback(() => {
    setCircles([{
      id: 1,
      angle: 180, // Start at bottom
      speed: GAME_CONFIG.INITIAL_SPEED,
    }]);
    setScore(0);
    setGameSpeed(GAME_CONFIG.INITIAL_SPEED);
  }, []);

  // Game loop
  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;

    setCircles(prevCircles => 
      prevCircles.map(circle => ({
        ...circle,
        angle: (circle.angle + gameSpeed) % 360,
      }))
    );

    animationRef.current = requestAnimationFrame(updateGame);
  }, [gameState, gameSpeed]);

  // Check if circle is in hit zone
  const isInHitZone = useCallback((angle: number) => {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const hitZoneStart = ((GAME_CONFIG.HIT_ZONE_POSITION - GAME_CONFIG.HIT_ZONE_ANGLE / 2) + 360) % 360;
    const hitZoneEnd = (GAME_CONFIG.HIT_ZONE_POSITION + GAME_CONFIG.HIT_ZONE_ANGLE / 2) % 360;
    
    if (hitZoneStart <= hitZoneEnd) {
      return normalizedAngle >= hitZoneStart && normalizedAngle <= hitZoneEnd;
    } else {
      return normalizedAngle >= hitZoneStart || normalizedAngle <= hitZoneEnd;
    }
  }, []);

  // Handle tap/click
  const handleTap = useCallback(() => {
    if (gameState !== 'playing') return;

    const hitCircle = circles.find(circle => isInHitZone(circle.angle));
    
    if (hitCircle) {
      // Successful hit
      const newScore = score + 1;
      setScore(newScore);
      setGameSpeed(prev => prev + GAME_CONFIG.SPEED_INCREMENT);
      
      // Update high score
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('circle-reflex-high-score', newScore.toString());
      }
    } else {
      // Miss - game over
      setGameState('gameOver');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [gameState, circles, score, highScore, isInHitZone]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    initializeGame();
  }, [initializeGame]);

  // Restart game
  const restartGame = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    startGame();
  }, [startGame]);

  // Start game loop when playing
  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(updateGame);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, updateGame]);

  // Calculate circle positions
  const getCirclePosition = (circle: CirclePosition) => {
    const radian = (circle.angle * Math.PI) / 180;
    const x = Math.cos(radian) * GAME_CONFIG.ORBIT_RADIUS;
    const y = Math.sin(radian) * GAME_CONFIG.ORBIT_RADIUS;
    return { x, y };
  };

  // Calculate hit zone path
  const getHitZonePath = () => {
    const startAngle = (GAME_CONFIG.HIT_ZONE_POSITION - GAME_CONFIG.HIT_ZONE_ANGLE / 2) * Math.PI / 180;
    const endAngle = (GAME_CONFIG.HIT_ZONE_POSITION + GAME_CONFIG.HIT_ZONE_ANGLE / 2) * Math.PI / 180;
    
    const innerRadius = GAME_CONFIG.ORBIT_RADIUS - 10;
    const outerRadius = GAME_CONFIG.ORBIT_RADIUS + 10;
    
    const x1 = Math.cos(startAngle) * innerRadius;
    const y1 = Math.sin(startAngle) * innerRadius;
    const x2 = Math.cos(endAngle) * innerRadius;
    const y2 = Math.sin(endAngle) * innerRadius;
    const x3 = Math.cos(endAngle) * outerRadius;
    const y3 = Math.sin(endAngle) * outerRadius;
    const x4 = Math.cos(startAngle) * outerRadius;
    const y4 = Math.sin(startAngle) * outerRadius;
    
    return `M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${outerRadius} ${outerRadius} 0 0 0 ${x4} ${y4} Z`;
  };

  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center p-4">
        <Card className="bg-background/5 border-border/20 backdrop-blur-sm p-8 text-center animate-fade-in">
          <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-game-core to-game-accent bg-clip-text text-transparent">
            Reflex
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Tap when the circle enters the target zone
          </p>
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">High Score</p>
            <p className="text-3xl font-bold text-game-accent">{highScore}</p>
          </div>
          <Button 
            onClick={startGame}
            size="lg"
            className="bg-game-core hover:bg-game-core/80 text-white shadow-lg hover:shadow-game-glow/50"
          >
            Start Game
          </Button>
        </Card>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center p-4">
        <Card className="bg-background/5 border-border/20 backdrop-blur-sm p-8 text-center animate-fade-in">
          <h2 className="text-4xl font-bold mb-4 text-destructive">Game Over</h2>
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">Final Score</p>
            <p className="text-4xl font-bold text-game-core mb-4">{score}</p>
            {score === highScore && score > 0 && (
              <p className="text-game-accent font-semibold animate-pulse-glow">New High Score! 🎉</p>
            )}
          </div>
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">High Score</p>
            <p className="text-2xl font-bold text-game-accent">{highScore}</p>
          </div>
          <Button 
            onClick={restartGame}
            size="lg"
            className="bg-game-core hover:bg-game-core/80 text-white shadow-lg hover:shadow-game-glow/50"
          >
            Play Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 cursor-pointer select-none"
      onClick={handleTap}
      ref={gameAreaRef}
    >
      {/* Score Display */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <p className="text-4xl font-bold text-game-core">{score}</p>
      </div>

      {/* Game Area */}
      <div className="relative">
        <svg 
          width={GAME_CONFIG.ORBIT_RADIUS * 2 + 100} 
          height={GAME_CONFIG.ORBIT_RADIUS * 2 + 100}
          className="overflow-visible"
        >
          {/* Orbit Path */}
          <circle
            cx={(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2}
            cy={(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2}
            r={GAME_CONFIG.ORBIT_RADIUS}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.3"
          />
          
          {/* Hit Zone */}
          <g transform={`translate(${(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2}, ${(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2})`}>
            <path
              d={getHitZonePath()}
              fill="hsl(var(--game-hit-zone))"
              opacity="0.3"
              className="animate-pulse-glow"
            />
          </g>

          {/* Central Core */}
          <circle
            cx={(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2}
            cy={(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2}
            r={GAME_CONFIG.CORE_RADIUS}
            fill="hsl(var(--game-core))"
            className="animate-pulse-glow"
          />

          {/* Orbiting Circles */}
          {circles.map(circle => {
            const position = getCirclePosition(circle);
            const isInZone = isInHitZone(circle.angle);
            
            return (
              <circle
                key={circle.id}
                cx={(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2 + position.x}
                cy={(GAME_CONFIG.ORBIT_RADIUS * 2 + 100) / 2 + position.y}
                r={GAME_CONFIG.CIRCLE_SIZE}
                fill={isInZone ? "hsl(var(--game-hit-zone))" : "hsl(var(--game-circle))"}
                className={isInZone ? "animate-pulse-glow" : ""}
                style={{
                  filter: isInZone ? 'drop-shadow(0 0 10px hsl(var(--game-hit-zone)))' : 'none',
                  transition: 'fill 0.1s ease-out'
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-muted-foreground">Tap when the circle glows green</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Speed: {gameSpeed.toFixed(1)}x</p>
      </div>
    </div>
  );
}