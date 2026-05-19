import AsyncStorage from '@react-native-async-storage/async-storage';

interface SavedData {
  highScore: number;
  gamesPlayed: number;
  bestLevel: number;
  totalMassAbsorbed: number;
}

const SAVE_KEY = '@blackhole_save';

const defaultData: SavedData = {
  highScore: 0,
  gamesPlayed: 0,
  bestLevel: 1,
  totalMassAbsorbed: 0,
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

  getData(): SavedData {
    return this.data;
  }
}

export const SaveManager = new SaveManagerClass();