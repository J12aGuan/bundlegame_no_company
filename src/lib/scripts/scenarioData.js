import {
  getCentralConfig,
  getTutorialConfig,
  getOrdersData,
  getStoresData,
  getCitiesData,
  getExperimentScenarios,
  getScenarioDatasetBundle,
  getScenarioDatasetNames
} from "../firebaseDB.js";

export async function fetchOrdersDataset(ordersId = "experiment") {
  return await getOrdersData(ordersId);
}

export async function fetchCentralConfigForGeneration() {
  return await getCentralConfig();
}

export async function fetchTutorialConfigForGeneration() {
  return await getTutorialConfig();
}

export async function fetchStoreDataset(storeId = "store") {
  const data = await getStoresData(storeId);
  return data ?? { stores: [], distances: {} };
}

export async function fetchCitiesDataset(citiesId = "cities") {
  const data = await getCitiesData(citiesId);
  return data ?? { startinglocation: "", travelTimes: {} };
}

export async function fetchExistingScenarioSet(scenarioSetId = "experiment") {
  return await getExperimentScenarios(scenarioSetId);
}

export async function fetchScenarioDatasetBundle(datasetName = "experiment") {
  return await getScenarioDatasetBundle(datasetName);
}

export async function fetchScenarioDatasetNames() {
  return await getScenarioDatasetNames();
}
