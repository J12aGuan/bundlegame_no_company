import json

data = {
    "stores": [
        {
            "store": "",
            "city": "",
            "items": [],
            "locations": [
                ["", "", ""],
                ["", "", ""],
                ["", "", ""]
            ],
            "cellDistance": 0,
            "Entrance": [0, 0],
            "waiting": [0, 0, 0, 0, 0, 0],
            "waitinginterval": 0,
            "refresh": 0,
            "tip": [0, 0, 0, 0, 0],
            "tipinterval": 0
        },
        {
            "store": "",
            "city": "",
            "items": [],
            "locations": [
                ["", "", ""],
                ["", "", ""],
                ["", "", ""]
            ],
            "cellDistance": 0,
            "Entrance": [0, 0],
            "waiting": [0, 0, 0, 0, 0, 0],
            "waitinginterval": 0,
            "refresh": 0,
            "tip": [0, 0, 0, 0, 0],
            "tipinterval": 0
        },
        {
            "store": "",
            "city": "",
            "items": [],
            "locations": [
                ["", "", ""],
                ["", "", ""],
                ["", "", ""]
            ],
            "cellDistance": 0,
            "Entrance": [0, 0],
            "waiting": [0, 0, 0, 0, 0, 0],
            "waitinginterval": 0,
            "refresh": 0,
            "tip": [0, 0, 0, 0, 0],
            "tipinterval": 0
        },
        {
            "store": "",
            "city": "",
            "items": [],
            "locations": [
                ["", "", ""],
                ["", "", ""],
                ["", "", ""]
            ],
            "cellDistance": 0,
            "Entrance": [0, 0],
            "waiting": [0, 0, 0, 0, 0, 0],
            "waitinginterval": 0,
            "refresh": 0,
            "tip": [0, 0, 0, 0, 0],
            "tipinterval": 0
        }
    ],
    "distances": {
        "": {
            "destinations": ["", "", ""],
            "distances": [0, 0, 0]
        },
        "": {
            "destinations": ["", "", ""],
            "distances": [0, 0, 0]
        },
        "": {
            "destinations": ["", "", ""],
            "distances": [0, 0, 0]
        },
        "": {
            "destinations": ["", "", ""],
            "distances": [0, 0, 0]
        }
    },
    "startinglocation": ""
}

def custom_json_dump(data, file, max_indent=2, current_level=0):
    """Recursively dumps JSON data with consistent indentation including inner lists like locations."""
    indent = " " * (current_level * 2)
    next_indent = " " * ((current_level + 1) * 2)

    if isinstance(data, dict):
        if current_level >= max_indent:
            json.dump(data, file, separators=(',', ':'))
        else:
            file.write("{\n")
            for i, (key, value) in enumerate(data.items()):
                file.write(next_indent + f'"{key}": ')
                custom_json_dump(value, file, max_indent, current_level + 1)
                if i < len(data) - 1:
                    file.write(",\n")
            file.write("\n" + indent + "}")
    elif isinstance(data, list):
        if current_level >= max_indent or all(isinstance(i, (str, int, float)) for i in data):
            # Keep compact for flat lists of strings/numbers
            json.dump(data, file)
        else:
            file.write("[\n")
            for i, item in enumerate(data):
                file.write(next_indent)
                custom_json_dump(item, file, max_indent, current_level + 1)
                if i < len(data) - 1:
                    file.write(",\n")
            file.write("\n" + indent + "]")
    else:
        json.dump(data, file)

with open("storesTemplate.json", "w") as f:
    custom_json_dump(data, f, max_indent=4)
