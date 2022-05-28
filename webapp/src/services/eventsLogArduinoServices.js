const { REACT_APP_AUTH } = process.env;

export async function GetEventsLogArduino(page = 1, limit = 100) {
    let formdata = new FormData();
    formdata.append("page", page);
    formdata.append("limit", limit);

    const response = await fetch("/api/eventsarduinologpaginateapi", {
        method: 'POST',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}