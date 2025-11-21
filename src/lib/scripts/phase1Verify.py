import json
def load_possibilities(filename):
    """
    Loads the default job data from a JSON file.
    """
    with open(filename, "r") as f:
        return json.load(f)
    
if __name__ == "__main__":
    default_data_path = "./src/lib/scripts/game_modes/phase1_possibilities.json"  # Replace with your path
    default_data = load_possibilities(default_data_path)
    count = 0
    maxes = set()
    mins = set()
    avgs = set()
    gcount = 0
    for group in default_data:
        count = 0
        for key, value in group.items():
            if not value:
                continue
            count += 1
            maxes.add(value["high_expected_value"])
            mins.add(value["low_expected_value"])
            avgs.add((value["high_expected_value"] + value["low_expected_value"])/2)
        
        if len(maxes) != count or len(mins) != count or len(avgs) != count:
            print(f"false at group {gcount}")

        maxes.clear()
        mins.clear()
        avgs.clear()
        gcount += 1