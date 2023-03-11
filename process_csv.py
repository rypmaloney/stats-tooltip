import csv
import json

def make_dict(csv_file, json_file):
    data={}
    with open(csv_file, 'r') as f:
        lines = csv.DictReader(f)
        for line in lines:
            key = line['FANGRAPHSNAME']
            data[key] = {
                "graph_id": line["IDFANGRAPHS"]
            }

    with open(json_file, 'w', encoding='utf-8') as jsonf:
        jsonf.write(json.dumps(data, indent=4))

make_dict("player_map.csv", "stript.json")