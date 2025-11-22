const stores = [{ "store": "Target", "city": "Emeryville", "items": ["watermelon", "apple", "pineapple", "grape", "banana"], "locations": [["Entrance", "Watermelon", ""], ["Apple", "Pineapple", ""], ["Grape", "Banana", ""]], "cellDistance": 3e3, "Entrance": [0, 0] }, { "store": "Berkeley Bowl", "city": "Berkeley", "items": ["apple", "pineapple", "grape", "orange", "watermelon"], "locations": [["Entrance", "Pineapple", "Watermelon"], ["Orange", "Apple", "Grape"], ["", "", ""]], "cellDistance": 1e3, "Entrance": [0, 0] }, { "store": "Sprouts Farmers Market", "city": "Oakland", "items": ["apple", "watermelon", "pear", "kiwi", "pineapple", "grape", "orange"], "locations": [["Apple", "Watermelon", "Pear"], ["Entrance", "Pineapple", "Kiwi"], ["Grape", "Orange", "Apple"]], "cellDistance": 2e3, "Entrance": [1, 0] }, { "store": "Safeway", "city": "Piedmont", "items": ["apple", "watermelon", "orange"], "locations": [["Entrance", "Watermelon", ""], ["Apple", "Orange", ""], ["", "", ""]], "cellDistance": 2e3, "Entrance": [0, 0] }];
const distances = { "Emeryville": { "destinations": ["Berkeley", "Oakland", "Piedmont"], "distances": [4, 2, 7] }, "Berkeley": { "destinations": ["Emeryville", "Oakland", "Piedmont"], "distances": [4, 5, 4] }, "Oakland": { "destinations": ["Emeryville", "Berkeley", "Piedmont"], "distances": [2, 5, 4] }, "Piedmont": { "destinations": ["Emeryville", "Berkeley", "Oakland"], "distances": [7, 4, 4] } };
const startinglocation = "Berkeley";
const stores1 = {
  stores,
  distances,
  startinglocation
};
export {
  stores1 as default,
  distances,
  startinglocation,
  stores
};
