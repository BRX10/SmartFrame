import requests
import sys

# Récupération des paramètres
id_frame = sys.argv[1]
id_library = sys.argv[2]
auth = sys.argv[3]
token = sys.argv[4]

## Envoie de la requete au client/server
headers = {
  'Authorization': auth + " " +token
}
payload = {'frame': id_frame, 'library': id_library }
print(payload)
response_json = requests.post('http://127.0.0.1:8080/api/eventtoframe', headers=headers, data=payload).json()
print(response_json)