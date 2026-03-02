import { saveExperimentScenarios } from "../firebaseDB.js";
import {
  fetchCentralConfigForGeneration,
  fetchTutorialConfigForGeneration,
  fetchOrdersDataset,
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchExistingScenarioSet
} from "./scenarioData.js";
import {
  estimateLocalTravelTime,
  estimatePickItemTime,
  crossCityExtraTime
} from "./scenarioTime.js";

export async function fetchGenerationInputs(options = {}) {}
export {
  fetchCentralConfigForGeneration,
  fetchTutorialConfigForGeneration,
  fetchOrdersDataset,
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchExistingScenarioSet,
  estimateLocalTravelTime,
  estimatePickItemTime,
  crossCityExtraTime
};

export function estimateOrderCompletionTime(order, context = {}) {
    const localTravel = estimateLocalTravelTime();
    const pickItem = estimatePickItemTime(order, context);

    const currentCity = context.currentCity ?? context.playerCity ?? "";
    const extraCrossCity = crossCityExtraTime(order?.city, currentCity, context);

    return localTravel + pickItem + extraCrossCity;
}

export function createOrderModel(rawOrder, context = {}) {
    const order = {
        
    }
}

export function enumerateBundles(orders = [], kMax = 3) {}

export function computeBundleScore(bundle = [], context = {}) {}

export function solveBestAndSecondBundle(orders = [], context = {}) {}

export function computeGap(bestScore, secondScore) {}

export function classifyDifficulty(relativeGap) {}

export function generateEasyCasePattern(context = {}) {}

export function generateHardCasePattern(context = {}) {}

export function generateCandidateCase(context = {}) {}

export function caseMatchesDifficulty(caseResult, targetDifficulty) {}

export function generateCaseUntilDifficultyMatch(targetDifficulty, context = {}) {}

export function buildScenarioRound(caseResult, context = {}) {}

export function serializeScenarioOutput(scenarios = [], metadata = {}) {}

export async function saveGeneratedScenarioSet(
  scenarios = [],
  scenarioSetId = "experimentScenarios"
) {}

export async function runScenarioGenerationPipeline(options = {}) {}
