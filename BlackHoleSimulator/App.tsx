import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Scene, { getSpawnFunctions } from './src/components/Scene';
import UI from './src/components/UI';

interface SceneState {
  bodyCount: number;
  bhMass: number;
}

export default function App() {
  const [bodyCount, setBodyCount] = useState(3);
  const [bhMass, setBhMass] = useState(12000);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [trailColor, setTrailColor] = useState('#00ffff');
  const [showToast, setShowToast] = useState(false);

  const handleStatsChange = useCallback((stats: SceneState) => {
    setBodyCount(stats.bodyCount);
    setBhMass(stats.bhMass);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSimSpeed(speed);
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
      />
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
});