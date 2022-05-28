import moment from "moment-timezone";
import "moment/locale/fr";

const { REACT_APP_AUTH } = process.env;

export async function GetAllPictureLibrary(idLibrary) {
    const response = await fetch("/api/pictures/"+idLibrary, {
        method: 'GET',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        redirect: 'follow'
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return await Promise.all(responseJson.map( async (item, idx) => {
        return {
            idx: idx,
            id: item._id.$oid,
            picture: URL.createObjectURL(await GetPictureFile(item._id.$oid)),
            title: item.name,
            fileName: item.file_name,
            order: item.order,
            subTitle: "Ordre : " + item.order + " - " + item.file_name,
            date: moment.utc(item.created_at).tz("Europe/Paris").fromNow()
        }
    }));
}


export async function PostPictureLibrary(idLibrary, name, order, file) {
    let formdata = new FormData();
    formdata.append("name", name);
    formdata.append("order", order);
    formdata.append('image', file);

    const response = await fetch("/api/picture/"+idLibrary, {
        method: 'POST',
        headers: new Headers({
            'Authorization': REACT_APP_AUTH,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) {
        throw responseJson;
    }

    return responseJson;
}


export async function GetPictureFile(idPicture) {
    const response = await fetch("/api/picturefile/"+idPicture, {
        method: 'GET',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        redirect: 'follow'
    });

    return await response.blob();
}

export async function GetPictureFileToFrame(idPicture, width, height) {
    const response = await fetch("/api/picturefileframe/"+width+"/"+height+"/"+idPicture, {
        method: 'GET',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        }),
        redirect: 'follow'
    });

    return await response.blob();
}


export async function DeletePicture(idPicture) {
    const response = await fetch("/api/picture/"+idPicture, {
        method: 'DELETE',
        headers: new Headers({
            'Authorization':  REACT_APP_AUTH,
        })
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}