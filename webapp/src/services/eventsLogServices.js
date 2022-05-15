const { REACT_APP_AUTH } = process.env;

export async function GetAllEventsLog() {
    const response = await fetch("/api/eventslog", {
        method: 'GET',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        redirect: 'follow'
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}