# SmartFrame

<br>

SmartFrame est... 

<br>

<br>

## Déploiement en Productio .


Vous pouvez build le projet via la commande :
```bash
docker-compose -f docker-compose.prod.yml up -d
```

<br>

Le projet étant dans une version de pilote, la fonctionalité login, n'est pas encore présente. 
Vous devez ajouter la clé d'api manuellement via les opérations ci-dessous

<br>

### Créer votre compte via la requête:
```bash
curl --location --request POST 'http://localhost:8080/api/auth/signup' \
--header 'Content-Type: application/json' \
--data-raw '{
    "username": "username",
    "password": "password"
}'
```

Retourne votre id :
```bash
{"id": "XXXXXXXXXXXX"}
```

<br>

### Identifiez-vous via la requête:
```bash
curl --location --request POST 'http://localhost:8080/api/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
    "username": "username",
    "password": "password"
}'
```

Retourne votre token :

```bash
{"token": "XXXXXXXXXXXX"}
```

<br>

### .env

Vous devez mettre votre token dans le fichier .env dans le TOKEN_API

<br>

### Vous devez re-build 

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```



Puis essayer http://localhost:8081/ 😇

<br>
<br>

##  Déploiement en Développement

Démarrer les contenaires via la commande

```bash
docker-compose -f docker-compose.dev.yml --env-file .dev.env up -d
```

Vous devez effectuer la même procédure que ci-dessous pour vous identifier


<br>


### Puis re-build avec :

```bash
docker-compose -f docker-compose.dev.yml --env-file .dev.env up --build -d
```



<br>
<br>
<br>
<br>


## MEMO JULES
```bash
crontab -e
crontab -l
service cron status
service cron restart
```
