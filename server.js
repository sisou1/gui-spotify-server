import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

let accessToken = null;

async function refreshAccessToken() {

    const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: REFRESH_TOKEN
        }),
        {
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        CLIENT_ID + ":" + CLIENT_SECRET
                    ).toString("base64"),
                "Content-Type":
                    "application/x-www-form-urlencoded"
            }
        }
    );

    accessToken = response.data.access_token;
}

app.post("/add-song", async (req, res) => {

    try {

        const query = req.body.query;

        if (!query)
            return res.send("missing query");

        if (!accessToken)
            await refreshAccessToken();

        const search = await axios.get(
            "https://api.spotify.com/v1/search",
            {
                params: {
                    q: query,
                    type: "track",
                    limit: 1
                },
                headers: {
                    Authorization:
                        "Bearer " + accessToken
                }
            }
        );

        const track =
            search.data.tracks.items[0];

        if (!track)
            return res.send("track not found");

        await axios.post(
            "https://api.spotify.com/v1/me/player/queue",
            null,
            {
                params: {
                    uri: track.uri
                },
                headers: {
                    Authorization:
                        "Bearer " + accessToken
                }
            }
        );

        res.send("added");

    } catch (err) {

        if (err.response?.status === 401) {

            await refreshAccessToken();

            return res.send("retry");
        }

        console.error(err);
        res.send("error");
    }
});

app.listen(3000);