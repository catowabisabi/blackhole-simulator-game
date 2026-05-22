import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Scene, { getSpawnFunctions } from './src/components/Scene';
import UI from './src/components/UI';
import { AudioManager } from './src/systems/AudioManager';
import { SaveManager } from './src/systems/SaveManager';

interface SceneState {
  bodyCount: number;
  bhMass: number;
  playerMass: number;
  playerAbsorbed: number;
  gameState: 'idle' | 'playing' | 'won' | 'lost';
  score: number;
  level: number;
}

export default function App() {
  const [bodyCount, setBodyCount] = useState(3);
  const [bhMass, setBhMass] = useState(12000);
  const [playerMass, setPlayerMass] = useState(40);
  const [playerAbsorbed, setPlayerAbsorbed] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [trailColor, setTrailColor] = useState('#00ffff');
  const [showToast, setShowToast] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [zoomLevel, setZoomLevel] = useState(0.5);

  useEffect(() => {
    AudioManager.init();
    SaveManager.load().then((data) => {
      setHighScore(data.highScore);
      setGamesPlayed(data.gamesPlayed);
      if (data.difficulty === 'easy' || data.difficulty === 'normal' || data.difficulty === 'hard') {
        setDifficulty(data.difficulty);
      }
    });
    return () => {
      AudioManager.cleanup();
    };
  }, []);

  const handleStatsChange = useCallback((stats: SceneState) => {
    setBodyCount(stats.bodyCount);
    setBhMass(stats.bhMass);
    setPlayerMass(stats.playerMass);
    setPlayerAbsorbed(stats.playerAbsorbed);
    setScore(stats.score);
    setLevel(stats.level);
  }, []);

  const handleGameStateChange = useCallback(async (state: 'idle' | 'playing' | 'won' | 'lost') => {
    setGameState(state);
    if (state === 'won' || state === 'lost') {
      const currentScore = score;
      const currentLevel = level;
      await SaveManager.updateScore(currentScore, currentLevel);
      setHighScore(SaveManager.getData().highScore);
      setGamesPlayed(SaveManager.getData().gamesPlayed);
      if (state === 'won') {
        await AudioManager.playSFX('win');
      } else {
        await AudioManager.playSFX('death');
      }
    }
  }, [score, level]);

  const handleLevelChange = useCallback((lvl: number) => {
    setLevel(lvl);
  }, []);

  const handleZoomLevelChange = useCallback((zl: number) => {
    setZoomLevel(zl);
  }, []);

  const handlePlayerPosChange = useCallback((pos: { x: number; y: number }) => {
  }, []);

  const handleRestart = useCallback(() => {
    const spawnFn = getSpawnFunctions();
    if (spawnFn && spawnFn.restartGame) {
      spawnFn.restartGame();
    }
    setGameState('idle');
    setScore(0);
    setLevel(1);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSimSpeed(speed);
  }, []);

  const handleDifficultyChange = useCallback((diff: 'easy' | 'normal' | 'hard') => {
    setDifficulty(diff);
    SaveManager.setDifficulty(diff);
  }, []);

  const spawnPlanet = useCallback(() => {
    const spawnFn = getSpawnFunctions();
    if (spawnFn) {
      spawnFn.spawnPlanet();
    }
  }, []);

  const spawnStar = useCallback(() => {
    const spawnFn = getSpawnFunctions();
    if (spawnFn) {
      spawnFn.spawnStar();
    }
  }, []);

  const spawnComet = useCallback(() => {
    const spawnFn = getSpawnFunctions();
    if (spawnFn) {
      spawnFn.spawnComet();
    }
  }, []);

  const handleClear = useCallback(() => {
    const spawnFn = getSpawnFunctions();
    if (spawnFn) {
      spawnFn.clear();
    }
  }, []);

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const handleTrailColorChange = useCallback((color: string) => {
    setTrailColor(color);
    const spawnFn = getSpawnFunctions();
    if (spawnFn) {
      spawnFn.setTrailColor(color);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Scene
        simSpeed={simSpeed}
        trailColor={isUnlocked ? trailColor : null}
        onStatsChange={handleStatsChange}
        onGameStateChange={handleGameStateChange}
        onPlayerPosChange={handlePlayerPosChange}
        onLevelChange={handleLevelChange}
        onZoomLevelChange={handleZoomLevelChange}
        difficulty={difficulty}
      />
      <UI
        bodyCount={bodyCount}
        bhMass={bhMass}
        simSpeed={simSpeed}
        onSpeedChange={handleSpeedChange}
        onSpawnPlanet={spawnPlanet}
        onSpawnStar={spawnStar}
        onSpawnComet={spawnComet}
        onClear={handleClear}
        onUnlock={handleUnlock}
        isUnlocked={isUnlocked}
        trailColor={trailColor}
        onTrailColorChange={handleTrailColorChange}
        playerMass={playerMass}
        playerAbsorbed={playerAbsorbed}
        gameState={gameState}
        score={score}
        onRestart={handleRestart}
        highScore={highScore}
        gamesPlayed={gamesPlayed}
        onShowStats={() => {
          Alert.alert(
            '📊 統計 / Statistics',
            `最高分 High Score: ${highScore}\n遊戲次數 Games: ${gamesPlayed}\n最高關卡 Best Level: ${SaveManager.getData().bestLevel}`,
            [{ text: '關閉 / Close' }]
          );
        }}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        zoomLevel={zoomLevel}
      />
      {gameState !== 'idle' && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            {gameState === 'won' && (
              <>
                <Text style={styles.overlayTitle}>🎉 勝利！</Text>
                <Text style={styles.overlaySubtitle}>你已成為超大質量黑洞</Text>
                <Text style={styles.overlayScore}>最終吸收 {playerAbsorbed}</Text>
                <Text style={styles.overlayScore}>分數 {score}</Text>
              </>
            )}
            {gameState === 'lost' && (
              <>
                <Text style={styles.overlayTitleLose}>💀 被吞噬了！</Text>
                <Text style={styles.overlaySubtitle}>撞上了更大的黑洞</Text>
                <Text style={styles.overlayScore}>最終吸收 {playerAbsorbed}</Text>
                <Text style={styles.overlayScore}>分數 {score}</Text>
              </>
            )}
            <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
              <Text style={styles.restartBtnText}>再玩一次 / Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {gameState === 'idle' && (
        <View style={styles.startHint}>
          <Text style={styles.startHintText}>按任意鍵或滑動開始遊戲</Text>
          <Text style={styles.startHintSub}>WASD / 方向鍵 / 滑動控制移動</Text>
        </View>
      )}
      {gameState === 'playing' && level > 1 && (
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>LV.{level}</Text>
        </View>
      )}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <View style={styles.toastContent}>
              <View style={styles.toastMessage}>
                <View style={styles.toastIconRow}>
                  <View style={styles.toastIcon} />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00000f',
  },
  toastContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  toast: {
    backgroundColor: 'rgba(50,255,150,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(50,255,150,0.4)',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIconRow: {
    marginRight: 8,
  },
  toastIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#5f9',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,20,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  overlayContent: {
    alignItems: 'center',
    padding: 40,
  },
  overlayTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#5f9',
    marginBottom: 10,
  },
  overlayTitleLose: {
    fontSize: 42,
    fontWeight: '900',
    color: '#f55',
    marginBottom: 10,
  },
  overlaySubtitle: {
    fontSize: 16,
    color: 'rgba(180,210,255,0.7)',
    marginBottom: 20,
  },
  overlayScore: {
    fontSize: 18,
    color: '#4af',
    marginBottom: 8,
  },
  restartBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 36,
    backgroundColor: '#4af',
    borderRadius: 20,
  },
  restartBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  startHint: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  startHintText: {
    fontSize: 18,
    color: 'rgba(180,210,255,0.5)',
    marginBottom: 6,
  },
  startHintSub: {
    fontSize: 12,
    color: 'rgba(100,180,255,0.3)',
  },
  levelBadge: {
    position: 'absolute',
    top: 90,
    right: 20,
    backgroundColor: 'rgba(255,100,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.5)',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffa500',
  },
});