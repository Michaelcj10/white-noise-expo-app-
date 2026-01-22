const https = require("https");
const { URL } = require("url");

// Sound data extracted from constants/sound.ts - only testing remote URLs
const soundsToTest = [
  {
    id: 3,
    name: "Air Conditioning",
    url: "https://slumbr.space/sounds/air-conditioning.mp3",
  },
  { id: 4, name: "Fan", url: "https://slumbr.space/sounds/fan.mp3" },
  { id: 5, name: "Fridge", url: "https://slumbr.space/sounds/fridge.mp3" },
  {
    id: 6,
    name: "Brown Noise",
    url: "https://slumbr.space/sounds/brown-noise.mp3",
  },
  {
    id: 7,
    name: "Pink Noise",
    url: "https://slumbr.space/sounds/pink-noise.mp3",
  },
  {
    id: 8,
    name: "Pink Noise Alt",
    url: "https://slumbr.space/sounds/pink-noise-alt.mp3",
  },
  {
    id: 9,
    name: "Pink Noise 2",
    url: "https://slumbr.space/sounds/pink-noise-2.mp3",
  },
  { id: 10, name: "Heater", url: "https://slumbr.space/sounds/heater.mp3" },
  {
    id: 11,
    name: "HVAC Vent",
    url: "https://slumbr.space/sounds/hvac-vent.mp3",
  },
  {
    id: 12,
    name: "Static Radio",
    url: "https://slumbr.space/sounds/static-radio.mp3",
  },
  {
    id: 13,
    name: "Alien Ambient",
    url: "https://slumbr.space/sounds/alien-ambient.mp3",
  },
  {
    id: 14,
    name: "Driving Rain",
    url: "https://slumbr.space/sounds/driving-rain.mp3",
  },
  {
    id: 15,
    name: "Rain on Tin Roof",
    url: "https://slumbr.space/sounds/rain-tin-roof.mp3",
  },
  {
    id: 16,
    name: "Ocean Swells",
    url: "https://slumbr.space/sounds/ocean-swells.mp3",
  },
  {
    id: 17,
    name: "Ocean Big Waves",
    url: "https://slumbr.space/sounds/ocean-waves-big.mp3",
  },
  {
    id: 18,
    name: "Beach Waves",
    url: "https://slumbr.space/sounds/beach-waves.mp3",
  },
  {
    id: 19,
    name: "Lake Waves",
    url: "https://slumbr.space/sounds/lake-waves.mp3",
  },
  { id: 20, name: "Storm", url: "https://slumbr.space/sounds/storm.mp3" },
  { id: 21, name: "Thunder", url: "https://slumbr.space/sounds/thunder.mp3" },
  { id: 22, name: "Wind", url: "https://slumbr.space/sounds/wind.mp3" },
  {
    id: 23,
    name: "Wind Howling",
    url: "https://slumbr.space/sounds/wind-howling.mp3",
  },
  { id: 24, name: "Birds", url: "https://slumbr.space/sounds/birds.mp3" },
  {
    id: 25,
    name: "Birds Rain Wind",
    url: "https://slumbr.space/sounds/birds-rain-wind.mp3",
  },
  { id: 26, name: "Forest", url: "https://slumbr.space/sounds/forest.mp3" },
  {
    id: 27,
    name: "Forest Leaves",
    url: "https://slumbr.space/sounds/forest-leaves.mp3",
  },
  {
    id: 28,
    name: "Forest Crickets Wind",
    url: "https://slumbr.space/sounds/forest-crickets-wind.mp3",
  },
  { id: 29, name: "Stream", url: "https://slumbr.space/sounds/stream.mp3" },
  {
    id: 30,
    name: "Sprinkler",
    url: "https://slumbr.space/sounds/sprinkler.mp3",
  },
  {
    id: 31,
    name: "Fireplace",
    url: "https://slumbr.space/sounds/fireplace.mp3",
  },
  {
    id: 32,
    name: "Wood Fire",
    url: "https://slumbr.space/sounds/wood-fire.mp3",
  },
  {
    id: 33,
    name: "Ferry at Sea",
    url: "https://slumbr.space/sounds/ferry-sea.mp3",
  },
  {
    id: 34,
    name: "Car Engine",
    url: "https://slumbr.space/sounds/car-engine.mp3",
  },
  {
    id: 35,
    name: "Car Bumpy",
    url: "https://slumbr.space/sounds/car-bumpy.mp3",
  },
  { id: 36, name: "Car Roof", url: "https://slumbr.space/sounds/car-roof.mp3" },
  {
    id: 37,
    name: "City Traffic",
    url: "https://slumbr.space/sounds/city-traffic.mp3",
  },
  {
    id: 38,
    name: "City Traffic Light",
    url: "https://slumbr.space/sounds/city-traffic-light.mp3",
  },
  {
    id: 39,
    name: "Highway Traffic",
    url: "https://slumbr.space/sounds/highway-traffic.mp3",
  },
  { id: 40, name: "Train", url: "https://slumbr.space/sounds/train.mp3" },
  {
    id: 41,
    name: "Train Onboard",
    url: "https://slumbr.space/sounds/train-onboard.mp3",
  },
  { id: 42, name: "Airport", url: "https://slumbr.space/sounds/airport.mp3" },
  {
    id: 43,
    name: "Airplane Cabin",
    url: "https://slumbr.space/sounds/airplane-cabin.mp3",
  },
  { id: 44, name: "Office", url: "https://slumbr.space/sounds/office.mp3" },
  {
    id: 45,
    name: "Dishwasher",
    url: "https://slumbr.space/sounds/dishwasher.mp3",
  },
  {
    id: 46,
    name: "Hair Dryer",
    url: "https://slumbr.space/sounds/hair-dryer.mp3",
  },
  {
    id: 47,
    name: "Gas Stove",
    url: "https://slumbr.space/sounds/gas-stove.mp3",
  },
  {
    id: 48,
    name: "Robot Drill",
    url: "https://slumbr.space/sounds/robot-drill.mp3",
  },
  {
    id: 49,
    name: "Metal Stairs",
    url: "https://slumbr.space/sounds/stairs-metal.mp3",
  },
  { id: 50, name: "Crickets", url: "https://slumbr.space/sounds/crickets.mp3" },
  {
    id: 51,
    name: "Frogs at Night",
    url: "https://slumbr.space/sounds/frogs-night.mp3",
  },
  {
    id: 52,
    name: "Heartbeat",
    url: "https://slumbr.space/sounds/heartbeat.mp3",
  },
  {
    id: 53,
    name: "Clock Ticking",
    url: "https://slumbr.space/sounds/clock-ticking.mp3",
  },
  {
    id: 54,
    name: "Music Box",
    url: "https://slumbr.space/sounds/music-box.mp3",
  },
  {
    id: 55,
    name: "Violin Calm",
    url: "https://slumbr.space/sounds/violin-calm.mp3",
  },
];

let tested = 0;
let working = 0;
let broken = [];

console.log("Testing audio URLs...\n");

function testUrl(sound) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      broken.push(`${sound.id}: ${sound.name} (TIMEOUT)`);
      resolve();
    }, 5000);

    try {
      const request = https.request(
        new URL(sound.url),
        {
          method: "HEAD",
        },
        (res) => {
          clearTimeout(timeout);
          tested++;
          if ([200, 206, 301, 302].includes(res.statusCode)) {
            working++;
            console.log(`✅ ${sound.id}: ${sound.name} (${res.statusCode})`);
          } else {
            broken.push(`${sound.id}: ${sound.name} (${res.statusCode})`);
            console.log(`❌ ${sound.id}: ${sound.name} (${res.statusCode})`);
          }
          resolve();
        }
      );

      request.on("error", (err) => {
        clearTimeout(timeout);
        broken.push(`${sound.id}: ${sound.name} (ERROR: ${err.message})`);
        console.log(`❌ ${sound.id}: ${sound.name} (ERROR)`);
        resolve();
      });

      request.end();
    } catch (err) {
      clearTimeout(timeout);
      broken.push(`${sound.id}: ${sound.name} (PARSE ERROR: ${err.message})`);
      console.log(`❌ ${sound.id}: ${sound.name} (PARSE ERROR)`);
      resolve();
    }
  });
}

async function runTests() {
  for (const sound of soundsToTest) {
    await testUrl(sound);
    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\nResults: ${working}/${tested} working`);

  if (broken.length > 0) {
    console.log(`\nBroken URLs (${broken.length}):`);
    broken.forEach((url) => console.log(`  ${url}`));
  } else {
    console.log("\n✅ All URLs are working!");
  }
}

runTests();
