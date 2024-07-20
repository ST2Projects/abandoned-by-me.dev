import {CLIENT_CODE, CLIENT_SECRET, DEBUG} from "$env/static/private";
import {supabase} from "$lib/supabaseClient.js";

/** @type {import('./$types').RequestHandler} */
export async function GET({url}){
    console.log("In get handler")
    console.table(url)
    const userCode = url.searchParams.get('code')
    console.log("Usercode : " + userCode)
    await exchangeCodeForAccessToken(userCode)

    return new Response(String("OK"))
}

async function exchangeCodeForAccessToken(code) {

    console.log("inside exchangeCodeForAccessToken");
    const params = {
        "client_id": CLIENT_CODE,
        "client_secret": CLIENT_SECRET,
        "code": code
    }

    if (DEBUG === "true") {
        console.log(params)
    }

    const requestURL = "https://github.com/login/oauth/access_token?" + new URLSearchParams(params)

    console.log(requestURL)

    await fetch(requestURL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
    })
        .then(res => res.text())
        .then( async responseText => {
            console.log(`Inside response handler with resp ${responseText}`)
            const responseParams = new URLSearchParams(responseText)

            const responseJson = {
                "access_token": responseParams.get("access_token"),
                "expires_in": responseParams.get("expires_in"),
                "refresh_token": responseParams.get("refresh_token"),
                "refresh_token_expires_in": responseParams.get("refresh_token_expires_in"),
                "token_type": responseParams.get("token_type"),
            }

            const userString = JSON.stringify(responseJson)

            console.log(`Response json ${userString}`)

            const modifiedRows = await supabase.from("users").upsert({
                "token_content": userString
            }).select()
            console.log(`Modified rows: ${modifiedRows}`)
    }).catch(e => console.error(e))
}