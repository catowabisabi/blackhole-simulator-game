import AsyncStorage from '@react-native-async-storage/async-storage';

interface SavedData {
  highScore: number;
  gamesPlayed: number;
  bestLevel: number;
  totalMassAbsorbed: number;
  difficulty: string;
  shownHints: string[];
  massLevel: number;
  speedLevel: number;
  maxStreak: number;
}

const SAVE_KEY = '@blackhole_save';

const defaultData: SavedData = {
  highScore: 0,
  gamesPlayed: 0,
  bestLevel: 1,
  totalMassAbsorbed: 0,
  difficulty: 'normal',
  shownHints: [],
  massLevel: 0,
  speedLevel: 0,
  maxStreak: 0,
};

class SaveManagerClass {
  data: SavedData = { ...defaultData };

  async load(): Promise<SavedData> {
    try {
      const json = await AsyncStorage.getItem(SAVE_KEY);
      if (json) {
        this.data = { ...defaultData, ...JSON.parse(json) };
      }
    } catch (e) {
      this.data = { ...defaultData };
    }
    return this.data;
  }

  async save() {
    try {
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
    }
  }

  async updateScore(score: number, level: number) {
    if (score > this.data.highScore) {
      this.data.highScore = score;
    }
    if (level > this.data.bestLevel) {
      this.data.bestLevel = level;
    }
    this.data.gamesPlayed += 1;
    await this.save();
  }

  async addAbsorbedMass(mass: number) {
    this.data.totalMassAbsorbed += mass;
    await this.save();
  }

  async reset() {
    this.data = { ...defaultData };
    await this.save();
  }

  async setDifficulty(difficulty: string) {
    this.data.difficulty = difficulty;
    await this.save();
  }

  getData(): SavedData {
    return this.data;
  }

  hasShownHint(hintId: string): boolean {
    return this.data.shownHints.includes(hintId);
  }

  async markHintShown(hintId: string): Promise<void> {
    if (!this.data.shownHints.includes(hintId)) {
      this.data.shownHints.push(hintId);
      await this.save();
    }
  }

  async setUpgradeLevel(type: 'mass' | 'speed', level: number) {
    if (type === 'mass') {
      this.data.massLevel = level;
    } else {
      this.data.speedLevel = level;
    }
    await this.save();
  }

  getUpgradeLevel(type: 'mass' | 'speed'): number {
    return type === 'mass' ? this.data.massLevel : this.data.speedLevel;
  }

  getMaxStreak(): number {
    return this.data.maxStreak || 0;
  }

  async setMaxStreak(s: number): Promise<void> {
    if (s > this.data.maxStreak) {
      this.data.maxStreak = s;
      await this.save();
    }
  }
}

export const SaveManager = new SaveManagerClass();