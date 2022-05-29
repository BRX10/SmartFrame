import moment from "moment-timezone";
import "moment/locale/fr";

export async function GetAllPictureLibrary(token, idLibrary) {
    
    const response = await fetch("/api/pictures/"+idLibrary, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
        redirect: 'follow'
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return await Promise.all(responseJson.map( async (item, idx) => {
        return {
            idx: idx,
            id: item._id.$oid,
            picture: new Promise( async (resolutionFunc, rejectionFunc) => { resolutionFunc(URL.createObjectURL( await GetPictureFile(token, item._id.$oid))) }),
            title: item.name,
            fileName: item.file_name,
            order: item.order,
            subTitle: "Ordre : " + item.order + " - " + item.file_name,
            date: moment.utc(item.created_at).tz("Europe/Paris").fromNow()
        }
    }));
}

export async function PostPictureLibrary(token, idLibrary, name, order, file) {
    
    let formdata = new FormData();
    formdata.append("name", name);
    formdata.append("order", order);
    formdata.append('image', file);

    const response = await fetch("/api/picture/"+idLibrary, {
        method: 'POST',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
        body: formdata
    });

    let responseJson = await response.json();
    if (responseJson.message) {
        throw responseJson;
    }

    return responseJson;
}


export async function GetPictureFile(token, idPicture) {
    
    const response = await fetch("/api/picturefile/"+idPicture, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
        redirect: 'follow'
    });

    return await response.blob();
}

export async function GetPictureFileToFrame(token, idPicture, width, height) {
    
    const response = await fetch("/api/picturefileframe/"+width+"/"+height+"/"+idPicture, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
        redirect: 'follow'
    });

    return await response.blob();
}


export async function DeletePicture(token, idPicture) {
    
    const response = await fetch("/api/picture/"+idPicture, {
        method: 'DELETE',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        })
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}