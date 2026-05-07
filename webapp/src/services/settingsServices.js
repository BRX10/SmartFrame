export async function GetEnrichmentSettings(token) {
    const response = await fetch("/api/settings/enrichment", {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
    });
    let data = await response.json();
    if (data.message) throw data;
    return data;
}

export async function UpdateEnrichmentSettings(token, settings) {
    const response = await fetch("/api/settings/enrichment", {
        method: 'PUT',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(settings),
    });
    let data = await response.json();
    if (!data.success) throw data;
    return data;
}
