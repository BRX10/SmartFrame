export async function GetActivity(token, page = 1, limit = 50, type = "all") {
    const params = new URLSearchParams({ page, limit, type });
    const response = await fetch(`/api/activity?${params}`, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
    });
    let data = await response.json();
    if (data.message) throw data;
    return data;
}
