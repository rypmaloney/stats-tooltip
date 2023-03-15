import csv
import json

def make_dict(csv_file, json_file):
    data={}
    with open(csv_file, 'r') as f:
        lines = csv.DictReader(f)
        for line in lines:
            if line['FANGRAPHSNAME'] != line['YAHOONAME']:
                y_key = line['YAHOONAME']
                data[y_key] = {
                "graph_id": line["IDFANGRAPHS"],
                "pos": line["POS"]
            }

            key = line['FANGRAPHSNAME']
            data[key] = {
                "graph_id": line["IDFANGRAPHS"],
                "pos": line["POS"]
            }

    with open(json_file, 'w', encoding='utf-8') as jsonf:
        jsonf.write(json.dumps(data, indent=4))

make_dict("player_map.csv", "stript.json")