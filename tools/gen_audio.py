"""Generate the game voice clips with Gemini TTS.

Runs inside the Composio workbench (run_composio_tool is preloaded there) and reads
audio/clips.json from GitHub. Each clip is sent with its niqqud text and voice to
gemini-2.5-flash-preview-tts, the 24kHz PCM reply is encoded to 48kbps MP3 with lameenc,
and the files are committed back to the repo under audio/<id>.mp3.

Run it again after changing js/data.js and `npm run clips`: existing files are skipped,
so delete a clip to regenerate it.
"""
import base64, json, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import lameenc

REPO = "yontanbe/mishak-haotiyot"
OUT = "/mnt/files/aq/mp3"
os.makedirs(OUT, exist_ok=True)
clips = json.loads(urllib.request.urlopen(f"https://raw.githubusercontent.com/{REPO}/main/audio/clips.json").read())


def to_mp3(pcm):
    e = lameenc.Encoder()
    e.set_bit_rate(48); e.set_in_sample_rate(24000); e.set_channels(1); e.set_quality(2)
    return e.encode(pcm) + e.flush()


def gen(c):
    path = f"{OUT}/{c['id'].replace('/', '__')}.mp3"
    if os.path.exists(path):
        return c["id"], "skip"
    for _ in range(3):
        r, err = run_composio_tool("GEMINI_GENERATE_CONTENT", {  # noqa: F821 (workbench helper)
            "model": "gemini-2.5-flash-preview-tts",
            "voice_name": c["voice"],
            "prompt": f"{c['style']}: {c['text']}",
        })
        audio = (r or {}).get("data", {}).get("audio_data")
        if audio:
            open(path, "wb").write(to_mp3(base64.b64decode(audio)))
            return c["id"], "ok"
        time.sleep(2)
    return c["id"], f"fail {err}"


def run(budget=165, workers=12):
    t = time.time()
    todo = [c for c in clips if not os.path.exists(f"{OUT}/{c['id'].replace('/', '__')}.mp3")]
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(lambda c: gen(c) if time.time() - t < budget - 25 else (c["id"], "deferred"), todo))


def commit(paths, message):
    upserts = [{"path": "audio/" + os.path.basename(p)[:-4].replace("__", "/") + ".mp3",
                "content": base64.b64encode(open(p, "rb").read()).decode(), "encoding": "base64"} for p in paths]
    owner, repo = REPO.split("/")
    return run_composio_tool("GITHUB_COMMIT_MULTIPLE_FILES", {  # noqa: F821
        "owner": owner, "repo": repo, "branch": "main", "message": message, "upserts": upserts})
