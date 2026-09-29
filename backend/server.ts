// quick and dirty Bun proxy to pin people's projects to Airtable
const airtableKey = Bun.env.AIRTABLE_KEY;
const airtableBaseID = Bun.env.AIRTABLE_BASE_ID;
const corsHeaders = { "Access-Control-Allow-Origin": Bun.env.CORS_URL}
const server = Bun.serve({
    port: 3000,
    routes: {
        "/getUserProjects/:username": async req => {
            const username = encodeURIComponent(req.params.username);
            const projectReq = await fetch(`https://hackatime.hackclub.com/api/v1/users/${username}/projects`);
            if (projectReq.status == 403) { return new Response("user's stats aren't public", {status: 403, headers: corsHeaders}); }
            if (projectReq.status == 404) { return new Response("not found", {status: 404, headers: corsHeaders}); }
            if (projectReq.status != 200) { return new Response("something bad happened", {status: projectReq.status, headers: corsHeaders}); }
            return Response.json(await projectReq.json(), {headers: corsHeaders})
        },
        "/sync/:username/:project": async req => {
            const projectCheck = await fetch(`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(req.params.username)}/project/${encodeURIComponent(req.params.project)}`);
            if (projectCheck.status == 400) { return new Response("bad request, project name is all whitespace or otherwise blank", {status: 400, headers: corsHeaders}); }
            if (projectCheck.status == 403) { return new Response("user's stats aren't public", {status: 403, headers: corsHeaders})}
            if (projectCheck.status == 404) { return new Response("user not found, or project has no data", {status: 404, headers: corsHeaders}); }
            if (projectCheck.status == 429) { return new Response("ratelimited by hackatime??", {status: 429, headers: corsHeaders})}
            if (projectCheck.status >= 500) { return new Response("something went wrong on hackatime's end", {status: projectCheck.status, headers: corsHeaders})}
            interface ProjectInfo { name: string, total_seconds: number, languages: string[], repo_url: string, total_heartbeats: number, last_heartbeat: string  }
            const projectData = await projectCheck.json() as ProjectInfo;
            // make a new record in the airtable
            const airtableReq = new Request(`https://api.airtable.com/v0/${airtableBaseID}/Projects%20in%20Progress`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${airtableKey}`,
                    "Content-Type": "application/json"
                },
                
                body: JSON.stringify({
                    "performUpsert": {
                        "fieldsToMergeOn": [ "Project Name", "Author" ]
                    },
                    "records": [{
                        "fields": {
                            "Project Name": projectData.name,
                            "Author": req.params.username,
                            "Raw Total Time": projectData.total_seconds,
                        }
                    }]
                })
            });
            const response = await fetch(airtableReq);
            let errorMessage =  "";
            switch (response.status) {
                case 400:
                    errorMessage = "Request encoding is invalid, not proper JSON"
                    break;
                case 401:
                    errorMessage = "Something went wrong with the Airtable key - poke Guac!"
                    break;
                case 402:
                    errorMessage = "Airtable is trying to squeeze us for more money..."
                    break;
                case 403:
                    errorMessage = "Something went wrong with the Airtable key - poke Guac!"
                    break;
                case 404:
                    errorMessage = "Uh oh, couldn't find the Airtable base or record... (very bad. poke guac immediately)"
                    break;
                case 413:
                    errorMessage = "Your request was too big, something has gone very wrong"
                    break;
                case 422:
                    errorMessage = "Uh oh, something went wrong with guac's proxy - poke him!"
                    console.error(await response.text())
                    break;
                case 429:
                    errorMessage = "rate limited :( try in 5 minutes?"
                    break;
                case 500:
                    errorMessage = "something has gone very wrong on Airtable's side...";
                    break
                case 502:
                    errorMessage = "Airtable might be down? poke guac!";
                    break;
                case 503:
                    errorMessage = "airtable did not like that very much"
                    break;
            }
            if (response.status >= 400) { return new Response(errorMessage, {headers: corsHeaders, status: response.status})}

            return new Response("synced successfully!", {headers: corsHeaders, status: 200});
        },
        "/*": () => new Response("there isn't a route here, silly")
    }
});

console.log(`Listening on ${server.url}`);