import {
  getCentralConfig,
  getTutorialConfig,
  getOrdersData,
  getStoresData,
  getExperimentScenarios
} from "../firebaseDB.js";

export async function fetchCentralConfigForGeneration() {
  return await getCentralConfig();
}

export async function fetchTutorialConfigForGeneration() {
  return await getTutorialConfig();
}

export async function fetchOrdersDataset(ordersId = "order_main") {
  return await getOrdersData(ordersId);
}

export async function fetchStoreDataset(storeId = "store") {
  const data = await getStoresData(storeId);
  return data ?? { stores: [], distances: {} };
}

export async function fetchExistingScenarioSet(scenarioSetId = "experimentScenarios") {
  return await getExperimentScenarios(scenarioSetId);
}

