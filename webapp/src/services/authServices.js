export async function AuthLogin(username, password) {

    let raw = JSON.stringify({
        "username": username,
        "password": password
    });
    
    const response = await fetch("/api/auth/login", {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/json'
        }),
        body: raw
    });

    let responseJson = await response.json();
    if (responseJson.message) throw responseJson;

    return responseJson;
}


export async function AuthSignout(token) {
    const response = await fetch("/api/auth/logout", {
        method: 'DELETE',
        headers: new Headers({
            'Authorization':  'Bearer ' + token,
        }),
    });
    
    return await response.json();
}