import AsyncStorage from "@react-native-async-storage/async-storage";

const PLAY_COUNT_KEY = "@play_counts";
const PLAY_HISTORY_KEY = "@play_history";

interface PlayCounts {
  [soundId: number]: number;
}

interface PlayHistory {
  [soundId: number]: number; // timestamp of last play
}

export class PlayTrackingService {
  private playCounts: PlayCounts = {};
  private playHistory: PlayHistory = {};
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      const storedCounts = await AsyncStorage.getItem(PLAY_COUNT_KEY);
      const storedHistory = await AsyncStorage.getItem(PLAY_HISTORY_KEY);

      if (storedCounts) {
        this.playCounts = JSON.parse(storedCounts);
      }
      if (storedHistory) {
        this.playHistory = JSON.parse(storedHistory);
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to load play data:", error);
      this.playCounts = {};
      this.playHistory = {};
      this.initialized = true;
    }
  }

  async incrementPlayCount(soundId: number) {
    await this.initialize();

    this.playCounts[soundId] = (this.playCounts[soundId] || 0) + 1;
    this.playHistory[soundId] = Date.now();

    console.log(
      `🎵 Play tracked: Sound ${soundId}, Total plays: ${this.playCounts[soundId]}, Timestamp: ${this.playHistory[soundId]}`
    );

    try {
      await AsyncStorage.setItem(
        PLAY_COUNT_KEY,
        JSON.stringify(this.playCounts)
      );
      await AsyncStorage.setItem(
        PLAY_HISTORY_KEY,
        JSON.stringify(this.playHistory)
      );
    } catch (error) {
      console.error("Failed to save play data:", error);
    }
  }

  async getPlayCount(soundId: number): Promise<number> {
    await this.initialize();
    return this.playCounts[soundId] || 0;
  }

  async getAllPlayCounts(): Promise<PlayCounts> {
    await this.initialize();
    return { ...this.playCounts };
  }

  async sortSoundsByPlayCount<T extends { id: number }>(
    sounds: T[]
  ): Promise<T[]> {
    await this.initialize();

    const sorted = [...sounds].sort((a, b) => {
      const aHistory = this.playHistory[a.id] || 0;
      const bHistory = this.playHistory[b.id] || 0;

      // If both have play history, sort by most recent
      if (aHistory > 0 && bHistory > 0) {
        return bHistory - aHistory; // Most recent first
      }

      // If only one has play history, it comes first
      if (aHistory > 0) return -1;
      if (bHistory > 0) return 1;

      // If neither has play history, maintain original order (by id)
      return a.id - b.id;
    });

    console.log(
      "🔄 Sounds sorted by play history:",
      sorted
        .slice(0, 5)
        .map((s: any) => `${s.id}:${s.name}(${this.playHistory[s.id] || 0})`)
    );
    return sorted;
  }
}

export const playTracking = new PlayTrackingService();
