export async function fetchStoreDataset(storeId = "store") {
  const { getStoresData } = await import("../firebaseDB.js");
  const data = await getStoresData(storeId);
  return data ?? { stores: [], distances: {} };
}

export async function fetchCitiesDataset(citiesId = "cities") {
  const { getCitiesData } = await import("../firebaseDB.js");
  const data = await getCitiesData(citiesId);
  return data ?? { startinglocation: "", travelTimes: {} };
}

export async function fetchScenarioDatasetBundle(datasetName = "experiment") {
  const { getScenarioDatasetBundle } = await import("../firebaseDB.js");
  return await getScenarioDatasetBundle(datasetName);
}
