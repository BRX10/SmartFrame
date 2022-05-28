import moment from "moment-timezone";
import "moment/locale/fr";

const { REACT_APP_AUTH } = process.env;

export async function GetAllLibrarys() {
    const response = await fetch("/api/librarys", {
        method: 'GET',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        redirect: 'follow'
    });
    
    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson.map((item) => {
        return {
            idx: item.idx,
            id: item._id.$oid,
            title: item.name,
            subTitle: "Délai: " + item.delay + "min",
            date: moment.utc(item.created_at).tz("Europe/Paris").fromNow()
        }
    });
}


export async function GetLibrary(idLibrary) {
    const response = await fetch("/api/library/"+idLibrary, {
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


export async function DeleteLibrary(idLibrary) {
    const response = await fetch("/api/library/"+idLibrary, {
        method: 'DELETE',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        })
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}


export async function PostLibrary(library, delay, action) {
    let formdata = new FormData();
    formdata.append("name", library);
    formdata.append("delay", delay);
    formdata.append("action", action);

    const response = await fetch("/api/library", {
        method: 'POST',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) {
        throw responseJson;
    }

    return responseJson;
}


export async function PutLibrary(idLibrary, library = null, delay = null, action = null) {
    let formdata = new FormData();
    if (library) {
        formdata.append("library", library);
    }
    if (delay) {
        formdata.append("delay", delay);
    }
    if (action) {
        formdata.append("action", action);
    }

    const response = await fetch("/api/library/"+idLibrary, {
        method: 'PUT',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) {
        throw responseJson;
    }

    return responseJson;
}




export const ListAction = [{
    title: "Aléatoire",
    value: "random"
}, {
    title: "Ordre",
    value: "order"
}];

export function ConvertKeyToStringAction (key) {
    switch (key) {
        case "random":
            return "Aléatoire";
        case "order":
            return "Ordre"
        default:
            return "Error"
    }
}