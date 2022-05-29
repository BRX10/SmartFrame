export async function GetEventsLogArduino(token, page = 1, limit = 200) {
    let formdata = new FormData();
    formdata.append("page", page);
    formdata.append("limit", limit);

    const response = await fetch("/api/eventsarduinologpaginateapi", {
        method: 'POST',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}