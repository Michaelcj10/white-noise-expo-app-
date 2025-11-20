// utils/soundCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const CACHE_DIR_NAME = "sound_cache";
const DOWNLOADED_SOUNDS_KEY = "@downloaded_sounds";

interface CachedSound {
  id: number;
  localUri: string;
  downloadedAt: number;
  originalUrl: string;
}

class SoundCacheManager {
  private downloadedSounds: Map<number, CachedSound> = new Map();
  private initialized = false;
  private downloadQueue: Set<number> = new Set();
  private cacheDir: Directory | null = null;
  private downloadCallbacks: Map<number, ((soundId: number) => void)[]> =
    new Map();

  async initialize() {
    if (this.initialized) return;

    try {
      // Skip initialization on web
      if (Platform.OS === "web") {
        console.log("📦 Sound cache not available on web");
        this.initialized = true;
        return;
      }

      // Create cache directory if it doesn't exist
      this.cacheDir = new Directory(Paths.cache, CACHE_DIR_NAME);

      // Check if directory exists, create if not
      if (!this.cacheDir.exists) {
        await this.cacheDir.create();
        console.log("📦 Sound cache directory created");
      }

      // Load cached sounds metadata from AsyncStorage
      const stored = await AsyncStorage.getItem(DOWNLOADED_SOUNDS_KEY);
      if (stored) {
        const cachedSoundsArray: CachedSound[] = JSON.parse(stored);

        // Verify each cached file still exists
        for (const cached of cachedSoundsArray) {
          try {
            const file = new File(cached.localUri);
            if (file.exists) {
              this.downloadedSounds.set(cached.id, cached);
            } else {
              console.log(
                `📦 Cached file missing for sound ${cached.id}, will re-download`
              );
            }
          } catch (err) {
            console.log(`📦 Error checking cached file for sound ${cached.id}`);
          }
        }

        console.log(`📦 Loaded ${this.downloadedSounds.size} cached sounds`);
      }

      this.initialized = true;
    } catch (error) {
      console.error("📦 Error initializing sound cache:", error);
      this.initialized = true; // Continue anyway
    }
  }

  async saveCacheMetadata() {
    try {
      const cachedSoundsArray = Array.from(this.downloadedSounds.values());
      await AsyncStorage.setItem(
        DOWNLOADED_SOUNDS_KEY,
        JSON.stringify(cachedSoundsArray)
      );
    } catch (error) {
      console.error("📦 Error saving cache metadata:", error);
    }
  }

  async downloadSound(
    soundId: number,
    remoteUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    // Skip on web
    if (Platform.OS === "web") {
      return null;
    }

    if (!this.cacheDir) {
      console.error("📦 Cache directory not initialized");
      return null;
    }

    // Check if already downloaded
    if (this.downloadedSounds.has(soundId)) {
      const cached = this.downloadedSounds.get(soundId)!;
      try {
        const file = new File(cached.localUri);
        if (file.exists) {
          console.log(`📦 Sound ${soundId} already cached`);
          return cached.localUri;
        }
      } catch (err) {
        // File doesn't exist, continue with download
      }
    }

    // Check if already in download queue
    if (this.downloadQueue.has(soundId)) {
      console.log(`📦 Sound ${soundId} already downloading`);
      return null;
    }

    this.downloadQueue.add(soundId);

    try {
      const fileName = `sound_${soundId}.mp3`;
      const file = new File(this.cacheDir, fileName);

      console.log(`📦 Downloading sound ${soundId} from ${remoteUrl}`);

      // Download the file using fetch - simpler approach for React Native
      const response = await fetch(remoteUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the response as blob (works in React Native)
      const blob = await response.blob();

      // Convert blob to base64 or use text - React Native compatible approach
      // Use FileReader to convert blob to arrayBuffer in React Native compatible way
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to convert blob to ArrayBuffer"));
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const uint8Array = new Uint8Array(arrayBuffer);

      // Write to file
      await file.write(uint8Array);

      // Verify file was downloaded
      if (file.exists) {
        const cached: CachedSound = {
          id: soundId,
          localUri: file.uri,
          downloadedAt: Date.now(),
          originalUrl: remoteUrl,
        };

        this.downloadedSounds.set(soundId, cached);
        await this.saveCacheMetadata();

        console.log(`📦 Sound ${soundId} cached successfully at ${file.uri}`);

        // Notify any listeners that download is complete
        this.notifyDownloadComplete(soundId);

        return file.uri;
      }

      console.error(`📦 Failed to download sound ${soundId}`);
      return null;
    } catch (error) {
      console.error(`📦 Error downloading sound ${soundId}:`, error);
      return null;
    } finally {
      this.downloadQueue.delete(soundId);
    }
  }

  isDownloaded(soundId: number): boolean {
    return this.downloadedSounds.has(soundId);
  }

  onDownloadComplete(soundId: number, callback: (soundId: number) => void) {
    if (!this.downloadCallbacks.has(soundId)) {
      this.downloadCallbacks.set(soundId, []);
    }
    this.downloadCallbacks.get(soundId)!.push(callback);
  }

  private notifyDownloadComplete(soundId: number) {
    const callbacks = this.downloadCallbacks.get(soundId);
    if (callbacks) {
      callbacks.forEach((cb) => cb(soundId));
      this.downloadCallbacks.delete(soundId);
    }
  }

  getCachedUri(soundId: number): string | null {
    const cached = this.downloadedSounds.get(soundId);
    return cached ? cached.localUri : null;
  }

  async getSource(soundItem: any, autoDownload: boolean = true): Promise<any> {
    // For local sounds, return the required asset directly
    if (soundItem.isLocal) {
      return soundItem.source;
    }

    // Check if sound is cached
    const cachedUri = this.getCachedUri(soundItem.id);
    if (cachedUri) {
      // Verify file still exists
      try {
        const file = new File(cachedUri);
        if (file.exists) {
          console.log(`📦 Using cached sound ${soundItem.id}`);
          return { uri: cachedUri };
        } else {
          // File was deleted, remove from cache
          this.downloadedSounds.delete(soundItem.id);
          await this.saveCacheMetadata();
        }
      } catch (err) {
        // Error checking file, remove from cache
        this.downloadedSounds.delete(soundItem.id);
        await this.saveCacheMetadata();
      }
    }

    // For web, always use remote URL (no caching)
    if (Platform.OS === "web") {
      return { uri: soundItem.source };
    }

    // Auto-download in background if enabled
    if (autoDownload && !this.downloadQueue.has(soundItem.id)) {
      // Download in background, but don't wait for it
      this.downloadSound(soundItem.id, soundItem.source).catch((err) => {
        console.error(
          `📦 Background download failed for sound ${soundItem.id}:`,
          err
        );
      });
    }

    // Return remote URL for now (streaming)
    return { uri: soundItem.source };
  }

  async clearCache(): Promise<void> {
    try {
      if (this.cacheDir && this.cacheDir.exists) {
        await this.cacheDir.delete();
        // Recreate directory
        await this.cacheDir.create();
      }

      this.downloadedSounds.clear();
      await AsyncStorage.removeItem(DOWNLOADED_SOUNDS_KEY);

      console.log("📦 Sound cache cleared");
    } catch (error) {
      console.error("📦 Error clearing cache:", error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      let totalSize = 0;
      for (const cached of this.downloadedSounds.values()) {
        try {
          const file = new File(cached.localUri);
          // Use size property directly if available
          if (file.exists) {
            // File size calculation would need additional API - for now return count
            totalSize += 1;
          }
        } catch {
          // Skip this file
        }
      }
      return totalSize;
    } catch (error) {
      console.error("📦 Error calculating cache size:", error);
      return 0;
    }
  }

  getDownloadedSoundIds(): number[] {
    return Array.from(this.downloadedSounds.keys());
  }
}

export const soundCache = new SoundCacheManager();
