const stores = [{ "store": "Safeway", "city": "Los Angeles", "locations": [["Entrance", "Cherry"], ["Grape", "Apple"]], "cellDistance": 2e3, "Entrance": [0, 0] }, { "store": "Whole Foods", "city": "Irvine", "locations": [["Entrance", "Apple"], ["Banana", "Pear"]], "cellDistance": 1e3, "Entrance": [0, 0] }];
const distances = { "Los Angeles": { "destinations": ["Irvine"], "distances": [4] }, "Irvine": { "destinations": ["Irvine"], "distances": [4] } };
const startinglocation = "Los Angeles";
const stores$1 = {
  stores,
  distances,
  startinglocation
};
export {
  stores$1 as default,
  distances,
  startinglocation,
  stores
};
