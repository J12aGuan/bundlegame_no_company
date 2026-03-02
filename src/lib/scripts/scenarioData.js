import {
  getCentralConfig,
  getTutorialConfig,
  getOrdersData,
  getStoresData,
  getCitiesData,
  getExperimentScenarios
} from "../firebaseDB.js";

export async function fetchOrdersDataset(ordersId = "order_main") {
  return await getOrdersData(ordersId);
}

export async function fetchStoreDataset(storeId = "store") {
  const data = await getStoresData(storeId);
  return data ?? { stores: [], distances: {} };
}

export async function fetchCitiesDataset(citiesId = "cities") {
  const data = await getCitiesData(citiesId);
  return data ?? { startinglocation: "", travelTimes: {} };
}

export async function fetchExistingScenarioSet(scenarioSetId = "experimentScenarios") {
  return await getExperimentScenarios(scenarioSetId);
}
