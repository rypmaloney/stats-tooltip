import csv
import json

def make_dict(csv_file, json_file):
    """
    Turn Player Map file into JSON to be queried in extension script.
    Some Yahoo are different from Fangraph namings,
    eg Kiké Hernández v.s. Enrique Hernández.
    """
    data={}
    with open(csv_file, 'r',  encoding='utf-8') as f:
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
        json.dump(data, jsonf, indent=4)

make_dict("PlayerMap3-23.csv", "map.json")
