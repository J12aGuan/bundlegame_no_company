export const storeDataset = {
  stores: [
    {
      store: "Berkeley Bowl",
      city: "Berkeley",
      Entrance: [0, 0],
      cellDistance: 1000,
      items: ["apples", "bananas", "rice", "milk"],
      locations: [
        ["Entrance", "apples", "bananas"],
        ["rice", "milk", "apples"],
      ],
    },
    {
      store: "Oakland Market",
      city: "Oakland",
      Entrance: [0, 0],
      cellDistance: 1000,
      items: ["tofu", "noodles", "tea", "beans"],
      locations: [
        ["Entrance", "tofu", "noodles"],
        ["tea", "beans", "tofu"],
      ],
    },
  ],
};

export const citiesDataset = {
  startinglocation: "Berkeley",
  travelTimes: {
    Berkeley: { Oakland: 10 },
    Oakland: { Berkeley: 10 },
  },
};

export const baseGeneratorOptions = {
  datasetName: "generator_test",
  totalRounds: 50,
  maxBundle: 3,
  payMin: 8,
  payMax: 24,
  seed: "route-aware-seed",
  generatedAt: "2026-04-28T00:00:00.000Z",
  scenarioSetVersionId: "generator_test_fixed",
};
