"""Backend API tests for Inazuma Rogue"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://footballer-quest.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_root(sess):
    r = sess.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "Inazuma" in data["message"]


def test_create_run_and_leaderboard(sess):
    payload = {
        "nickname": "TEST_Axel",
        "wave": 5,
        "glory": 999999,
        "result": "win",
        "wins": 4,
        "recruits": 2,
        "fusions": 1,
        "team": ["Axel Blaze", "Mark Evans", "Jude Sharp"],
    }
    r = sess.post(f"{API}/runs", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("id"), str) and len(body["id"]) > 0
    assert body["nickname"] == payload["nickname"]
    assert body["glory"] == payload["glory"]
    assert body["team"] == payload["team"]
    # no ObjectId leak
    assert "_id" not in body

    # leaderboard sorted desc by glory, contains our record at top
    lb = sess.get(f"{API}/leaderboard")
    assert lb.status_code == 200
    items = lb.json()
    assert isinstance(items, list) and len(items) >= 1
    for it in items:
        assert isinstance(it["id"], str)
        assert "_id" not in it
    glories = [it["glory"] for it in items]
    assert glories == sorted(glories, reverse=True)
    assert items[0]["glory"] >= payload["glory"]


def test_validation_empty_nickname(sess):
    r = sess.post(f"{API}/runs", json={
        "nickname": "", "wave": 1, "glory": 0, "result": "lose"
    })
    assert r.status_code == 422


def test_validation_long_nickname(sess):
    r = sess.post(f"{API}/runs", json={
        "nickname": "x" * 17, "wave": 1, "glory": 0, "result": "lose"
    })
    assert r.status_code == 422


def test_validation_wave_range(sess):
    r = sess.post(f"{API}/runs", json={
        "nickname": "TEST_x", "wave": 0, "glory": 0, "result": "lose"
    })
    assert r.status_code == 422
