import {
  getStoresData,
  getCitiesData,
  getScenarioDatasetBundle
} from "../firebaseDB.js";

export async function fetchStoreDataset(storeId = "store") {
  const data = await getStoresData(storeId);
  return data ?? { stores: [], distances: {} };
}

export async function fetchCitiesDataset(citiesId = "cities") {
  const data = await getCitiesData(citiesId);
  return data ?? { startinglocation: "", travelTimes: {} };
}

export async function fetchScenarioDatasetBundle(datasetName = "experiment") {
  return await getScenarioDatasetBundle(datasetName);
}
