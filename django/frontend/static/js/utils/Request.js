export async function Request(method, url, bodyNotFormat = null, headers = {}, parseHasText = false) {
	let body = undefined;
	let isJson = true;

	if(bodyNotFormat) {
		if(bodyNotFormat instanceof FormData) {
			body = bodyNotFormat;
			isJson = false;
		} else {
			body = JSON.stringify(bodyNotFormat)
		}
	}
	
	const csrfToken = window.csrfToken;

    const response = await fetch(url, {
        method,
        headers: {
            ...(isJson ? { 'Content-Type': 'application/json' } : {}),
            'X-CSRFToken': csrfToken,
            ...headers
        },
        body,
        credentials: 'include'
    });

    if (!response.ok) {
        try {
            const data = await response.json();
            console.log("MESSAGE SENT");
            throw new Error(data?.message ?? 'Network response was not ok');
        } catch {
            console.log("MESSAGE NOT SENT");
            throw new Error('Network response was not ok');
        }
    }

    if (parseHasText) {
        return response.text();
    }

    return response.json();
}
