"""Generate the game voice clips with Gemini TTS, resumable.

Runs inside the Composio workbench (run_composio_tool is preloaded there).
- reads audio/clips.json (what should exist) and audio/done.json (fingerprints of what was generated) from GitHub
- generates only clips whose fingerprint (voice|style|text) changed or are missing
- encodes 24kHz PCM to 48kbps MP3 with lameenc and commits each batch, with the updated done.json, straight to the repo
Call step(budget_seconds) repeatedly until it returns 0 remaining.
"""
import base64, hashlib, json, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import lameenc

REPO = "yontanbe/mishak-haotiyot"
RAW = f"https://raw.githubusercontent.com/{REPO}/main/"
FAILS = {}


def fp(c):
    return hashlib.sha1(f"{c['voice']}|{c['style']}|{c['text']}".encode()).hexdigest()[:12]


def fetch(path):
    return json.loads(urllib.request.urlopen(RAW + path + f"?t={time.time()}").read())


def to_mp3(pcm):
    e = lameenc.Encoder()
    e.set_bit_rate(48); e.set_in_sample_rate(24000); e.set_channels(1); e.set_quality(2)
    return e.encode(pcm) + e.flush()


def tts(c):
    for _ in range(2):
        r, err = run_composio_tool("GEMINI_GENERATE_CONTENT", {  # noqa: F821 (workbench helper)
            "model": "gemini-2.5-flash-preview-tts", "voice_name": c["voice"],
            "prompt": f"{c['style']}: {c['text']}"})
        a = (r or {}).get("data", {}).get("audio_data")
        if a:
            return to_mp3(base64.b64decode(a))
        time.sleep(1)
    FAILS[c["id"]] = FAILS.get(c["id"], 0) + 1
    return None


def step(budget=150, workers=10, batch=40):
    t = time.time()
    clips = fetch("audio/clips.json")
    done = fetch("audio/done.json")
    todo = [c for c in clips if done.get(c["id"]) != fp(c) and FAILS.get(c["id"], 0) < 2]
    made = 0
    while todo and time.time() - t < budget - 60:
        chunk, todo = todo[:batch], todo[batch:]
        with ThreadPoolExecutor(workers) as ex:
            res = list(ex.map(lambda c: (c, tts(c)), chunk))
        ups = []
        for c, mp3 in res:
            if mp3:
                ups.append({"path": f"audio/{c['id']}.mp3", "content": base64.b64encode(mp3).decode(), "encoding": "base64"})
                done[c["id"]] = fp(c)
        if not ups:
            continue
        ups.append({"path": "audio/done.json", "content": json.dumps(done, ensure_ascii=False, indent=0, sort_keys=True), "encoding": "utf-8"})
        owner, repo = REPO.split("/")
        r, e = run_composio_tool("GITHUB_COMMIT_MULTIPLE_FILES", {  # noqa: F821
            "owner": owner, "repo": repo, "branch": "main",
            "message": f"Regenerate voice clips ({len(ups) - 1})", "upserts": ups})
        if e:
            return f"commit error {str(e)[:200]}"
        made += len(ups) - 1
    return {"made": made, "remaining": len(todo), "fails": FAILS}
