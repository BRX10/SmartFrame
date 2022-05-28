import moment from "moment-timezone";
import "moment/locale/fr";

const { REACT_APP_AUTH } = process.env;

export async function GetAllFrames() {
    const response = await fetch("/api/frames", {
        method: 'GET',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        redirect: 'follow'
    });
    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;
    
    return responseJson.map( (frame) => {
        return {
            idx: frame.idx,
            id: frame._id.$oid,
            title: frame.name,
            subTitle: frame.inch + '" - ' + frame.resolution_width + "x"+ frame.resolution_height + " - " + frame.ip,
            date: moment.utc(frame.created_at).tz("Europe/Paris").fromNow()
        }
    })
}

export async function PostFrame(name, ip, key, inch, resolution_width, resolution_height, orientation, type) {
    let formdata = new FormData();
    formdata.append("name", name);
    formdata.append("ip", ip);
    formdata.append("key", key);
    formdata.append("inch", inch);
    formdata.append("rWidth", resolution_width);
    formdata.append("rHeight", resolution_height);
    formdata.append("type", type);
    formdata.append("orientation", orientation);

    const response = await fetch("/api/frame", {
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


export async function GetFrame(idFrame) {
    const response = await fetch("/api/frame/"+idFrame, {
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


export async function DeleteFrame(idFrame) {
    const response = await fetch("/api/frame/"+idFrame, {
        method: 'DELETE',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        })
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}


export async function ChangeFrameLibraryDisplay(idFrame, idLibrary) {
    let formdata = new FormData();
    formdata.append("idLibrary", idLibrary);
    
    const response = await fetch("/api/frame/"+idFrame, {
        method: 'PUT',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}

export async function EventToFrame(idFrame, idLibrary) {
    let formdata = new FormData();
    formdata.append("frame", idFrame);
    formdata.append("library", idLibrary);

    const response = await fetch("/api/eventtoframe", {
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




export const ListOrientation = [{
    title: "Portrait",
    value: "portrait"
}, {
    title: "Paysage",
    value: "paysage"
}];

export function ConvertKeyToStringOrientation (key) {
    switch (key) {
        case "paysage":
            return "Paysage";
        case "portrait":
            return "Portrait"
        default:
            return "Error"
    }
}

export const ListType = [{
    title: "E-Paper - Raspberry",
    value: "e_paper_raspbery"
}, {
    title: "E-Paper - Arduino",
    value: "e_paper_arduino"
}];

export function ConvertKeyToStringType (key) {
    switch (key) {
        case "e_paper_raspbery":
            return "E-Paper - Raspberry";
        case "e_paper_arduino":
            return "E-Paper - Arduino"
        default:
            return "Error"
    }
}
