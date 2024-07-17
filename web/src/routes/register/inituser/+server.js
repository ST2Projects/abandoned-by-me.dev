import {CLIENT_CODE, CLIENT_SECRET, DEBUG} from "$env/static/private";
import {supabase} from "$lib/supabaseClient.js";

/** @type {import('./$types').RequestHandler} */
export function GET({url}){
    console.log("In get handler")
    const userCode = url.searchParams.get('code')
    console.log(userCode)
    exchangeCodeForAccessToken(userCode)

    return new Response(String("OK"))
}

function exchangeCodeForAccessToken(code) {

    const params = {
        "client_id": CLIENT_CODE,
        "client_secret": CLIENT_SECRET,
        "code": code
    }

    if (DEBUG === "true") {
        console.table(params)
    }

    fetch("https://github.com/login/oauth/access_token" + new URLSearchParams(params), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
    }).then(res => addNewUser(res))
        .catch(e => console.error(e))
}

function addNewUser({res}) {
    const err = supabase.from("users").upsert({
        token_content: res.json()
    })
}