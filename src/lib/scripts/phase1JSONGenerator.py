
import json
import random
import math
from itertools import permutations

names = [
    "Noah", "Liam", "Jacob", "Mason", "William", "Ethan", "Michael", "Oliver", "Elijah", "James",
    "Lucas", "Benjamin", "Alexander", "Aiden", "Daniel", "Logan", "David", "Matthew", "Christopher", "Joseph",
    "Olivia", "Emma", "Ava", "Sophia", "Isabella", "Charlotte", "Mia", "Amelia", "Evelyn", "Abigail", "Park",
    "Marcus"
    ]


def load(filename):
    """
    Loads the default job data from a JSON file.
    """
    with open(filename, "r") as f:
        return json.load(f)

#everything below is a generator function
"""
orders will have ids: start_id -> start_id + 3
loc is the possible ending locations of the previous state, used to calculate optimal probabilities
"""
def pure_randomness(default_job, start_id, loc):
    varies = []
    for _ in range(4):
        varies.append({
            "location": "none",
            "earnings": 0,
            "amount": 0,
            "unique": 0
        })
    return generate_group(default_job, start_id, varies, loc)

def equal_location_earnings(default_job, start_id, loc):
    varies = []
    for _ in range(4):
        varies.append({
            "location": "Sprouts Farmers Market",
            "earnings": 20,
            "amount": 0,
            "unique": 0
        })
    return generate_group(default_job, start_id, varies, loc)

def equal_earnings(default_job, start_id, loc):
    varies = []
    for _ in range(4):
        varies.append({
            "location": "none",
            "earnings": 20,
            "amount": 0,
            "unique": 0
        })
    return generate_group(default_job, start_id, varies, loc)

def vary_location(default_job, start_id, loc):
    varies = []
    for _ in range(4):
        varies.append({
            "location": "none",
            "earnings": 20,
            "amount": 8,
            "unique": 2
        })
    return generate_group(default_job, start_id, varies, loc)

def commonsense_item_amount(default_job, start_id, loc):
    varies = []
    #random index is the "easy" or obvious choice
    random_index = int(random.random()*4)
    for x in range(4):
        if x == random_index:
            varies.append({
                "location": "Sprouts Farmers Market",
                "earnings": 20,
                "amount": 5,
                "unique": 2
            })
        else:
            varies.append({
                "location": "Sprouts Farmers Market",
                "earnings": 20,
                "amount": 15,
                "unique": 5
            })
    return generate_group(default_job, start_id, varies, loc)

def vary_earnings_item_amount(default_job, start_id, loc):
    varies = []
    for x in range(4):
        varies.append({
            "location": "Sprouts Farmers Market",
            "earnings": 0,
            "amount": 0,
            "unique": 0
        })
    return generate_group(default_job, start_id, varies, loc)

def equal_everything(default_job, start_id, loc):
    #only thing that varies is the types of foods
    varies = []
    for x in range(4):
        varies.append({
            "location": "Sprouts Farmers Market",
            "earnings": 20,
            "amount": 6,
            "unique": 3
        })
    return generate_group(default_job, start_id, varies, loc)

#end generator functions here

def generate_group(default_job, start_id, varies, loc):
    order1 = generate(default_job, start_id, varies[0])
    order2 = generate(default_job, start_id + 1, varies[1])
    order3 = generate(default_job, start_id + 2, varies[2])
    order4 = generate(default_job, start_id + 3, varies[3])
    return (order1, order2, order3, order4)

def generate(default_job, id, vary):
    #randomize
    """
    Generates a single random order based on default job data and returns the type of indicator
    """
    order = {
        "name": random.choice(names),
        "id": f"order{id}",
    }
    if (vary['location'] == "none"):
        store = random.choice(default_job["stores"])
    else:
        store = find_store(default_job, vary['location'])

    order["store"] = store["store"]
    if vary['earnings'] == 0:
        order["earnings"] = int(random.random()*40)
    else:
        order["earnings"] = vary['earnings']
    

    if order["earnings"] < 1:
        order["earnings"] = 1
    order["startingearnings"] = order["earnings"]

    order["city"] = store["city"]
    if vary['amount'] == 0:
        order["amount"] = int(random.random()*20)
    else:
        order["amount"] = vary["amount"]
    if order["amount"] < 1:
        order["amount"] = 1
    order["expire"] = 1
    order["items"] = {}
    order["demand"] = 0
    
    if vary["unique"] == 0:
        unique_items = store['items']
    else:
        unique_items = random.sample(store['items'], vary["unique"])
    for _ in range(order["amount"]):
        item = random.choice(unique_items)
        order["items"][item] = order["items"].get(item, 0) + 1
    return order
    

def find_store(default_job, name):
    for s in default_job["stores"]:
        if s["store"] == name:
            return s
    return {}

def custom_json_dump(data, file, max_indent=2, current_level=0):
    """Recursively dumps JSON data with limited indentation depth."""
    if isinstance(data, dict):
        if current_level >= max_indent:
            json.dump(data, file, separators=(',', ':'))  # Minified format beyond max_indent
        else:
            file.write("{\n")
            for i, (key, value) in enumerate(data.items()):
                file.write(" " * (current_level * 2) + f'"{key}": ')
                custom_json_dump(value, file, max_indent, current_level + 1)
                if i < len(data) - 1:
                    file.write(",\n")
            file.write("\n" + " " * ((current_level - 1) * 2) + "}")
    elif isinstance(data, list):
        if current_level >= max_indent:
            json.dump(data, file, separators=(',', ':'))  # Minified format beyond max_indent
        else:
            file.write("[\n")
            for i, item in enumerate(data):
                file.write(" " * (current_level * 2))
                custom_json_dump(item, file, max_indent, current_level + 1)
                if i < len(data) - 1:
                    file.write(",\n")
            file.write("\n" + " " * ((current_level - 1) * 2) + "]")
    else:
        json.dump(data, file)


        
def createSet(func, default_job, n, next_orders, previous_locs={"Emeryville"}):
    orders = func(default_job, n, previous_locs)
    l = set()
    for o in orders:
        o["generator"] = func.__name__
    next_orders.extend(orders)
    return l
    
def createNew(default_job_data_path):
    default_job = load(default_job_data_path)
    next_orders = []
    previous_locs = {default_job["startinglocation"]}
    count = 0
    generators = [vary_earnings_item_amount,vary_location, equal_earnings, equal_everything, equal_location_earnings, commonsense_item_amount, pure_randomness]
    previous_locs = createSet(commonsense_item_amount, default_job, count, next_orders, previous_locs)
    count += 4
    for x in range(80):
        if x % 5 == 3:
            previous_locs = createSet(pure_randomness, default_job, count, next_orders, previous_locs)
            count += 4
            continue
        if x % 3 <= 1:
            previous_locs = createSet(random.choice(generators), default_job, count, next_orders, previous_locs)
        else:
            previous_locs = createSet(equal_location_earnings, default_job, count, next_orders, previous_locs)
        count += 4

    with open("phase1_orders.json", "w") as f:
        custom_json_dump(next_orders, f, max_indent=3)  # Write orders to JSON with indentation


if __name__ == "__main__":
    createNew("./src/lib/configs/stores1.json")