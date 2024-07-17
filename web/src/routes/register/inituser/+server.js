import {CLIENT_CODE, CLIENT_SECRET, DEBUG} from "$env/static/private";
import {supabase} from "$lib/supabaseClient.js";

/** @type {import('./$types').RequestHandler} */
export function GET({url}){
    console.log("In get handler")
    console.table(url)
    const userCode = url.searchParams.get('code')
    console.log("Usercode : " + userCode)
    exchangeCodeForAccessToken(userCode)

    return new Response(String("OK"))
}

function exchangeCodeForAccessToken(code) {

    console.log("inside exchangeCodeForAccessToken");
    const params = {
        "client_id": CLIENT_CODE,
        "client_secret": CLIENT_SECRET,
        "code": code
    }

    if (DEBUG === "true") {
        console.log(params)
    }

    fetch("https://github.com/login/oauth/access_token" + new URLSearchParams(params), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
    }).then(async res => {
        console.log("Inside response handler")
        await addNewUser(res)
    }).catch(e => console.error(e))
}

async function addNewUser({res}) {
    console.log("inside addNewUser " + res);
    const err = supabase.from("users").upsert({
        token_content: res.json()
    }).select()
}