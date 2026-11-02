import os
import json
import time
import secrets
import hashlib
import sqlite3

from flask import Flask, jsonify, request

app = Flask(__name__)

DB_PATH = os.environ.get(
    "DB_PATH",
    "/tmp/dualclash_demo.db" if os.environ.get("VERCEL")
    else os.path.join(os.path.dirname(__file__), "dualclash_demo.db")
)

SEED_FILE = os.path.join(os.path.dirname(__file__), "demo_rounds.json")
ROUND_SECONDS = 35


def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

    conn = get_connection()
    try:
        conn.execute("PRAGMA journal_mode=WAL")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS demo_game_rounds (
                round_id INTEGER PRIMARY KEY,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                pulse INTEGER NOT NULL,
                blade INTEGER NOT NULL,
                commitment TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active'
            )
        """)

        count = conn.execute(
            "SELECT COUNT(*) FROM demo_game_rounds"
        ).fetchone()[0]

        if count == 0 and os.path.exists(SEED_FILE):
            with open(SEED_FILE, "r") as f:
                rows = json.load(f)

            for row in rows:
                conn.execute("""
                    INSERT OR IGNORE INTO demo_game_rounds
                    (round_id, start_time, end_time, pulse, blade,
                     commitment, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    row["round_id"],
                    row["start_time"],
                    row["end_time"],
                    row["pulse"],
                    row["blade"],
                    row.get("commitment", ""),
                    row["status"]
                ))

        conn.commit()
    finally:
        conn.close()


@app.after_request
def add_headers(response):
    origin = os.environ.get("FRONTEND_ORIGIN", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/api/demo/round/current", methods=["GET", "OPTIONS"])
def current_round():
    if request.method == "OPTIONS":
        return "", 204

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        now = time.time()

        row = conn.execute("""
            SELECT * FROM demo_game_rounds
            WHERE status = 'active'
            ORDER BY round_id DESC LIMIT 1
        """).fetchone()

        if row and now >= row["end_time"]:
            conn.execute("""
                UPDATE demo_game_rounds
                SET status = 'completed'
                WHERE round_id = ?
            """, (row["round_id"],))
            row = None

        if row is None:
            last = conn.execute("""
                SELECT MAX(round_id) AS last_id
                FROM demo_game_rounds
            """).fetchone()

            round_id = (last["last_id"] or 1000) + 1
            pulse = secrets.randbelow(10)
            blade = secrets.randbelow(10)
            seed = secrets.token_hex(32)

            commitment = hashlib.sha256(
                f"{round_id}:{pulse}:{blade}:{seed}".encode()
            ).hexdigest()

            conn.execute("""
                INSERT INTO demo_game_rounds
                (round_id, start_time, end_time, pulse, blade,
                 commitment, status)
                VALUES (?, ?, ?, ?, ?, ?, 'active')
            """, (
                round_id, now, now + ROUND_SECONDS,
                pulse, blade, commitment
            ))

            row = conn.execute("""
                SELECT * FROM demo_game_rounds
                WHERE round_id = ?
            """, (round_id,)).fetchone()

        conn.commit()

        remaining = max(
            0, int(row["end_time"] - now + 0.999)
        )

        return jsonify({
            "success": True,
            "round": {
                "round_id": row["round_id"],
                "status": "active",
                "remaining_seconds": remaining,
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "commitment": row["commitment"]
            }
        })
    except Exception:
        conn.rollback()
        app.logger.exception("Current round error")
        return jsonify({"success": False, "message": "Server error"}), 500
    finally:
        conn.close()


@app.route("/api/demo/round/<int:round_id>", methods=["GET", "OPTIONS"])
def round_result(round_id):
    if request.method == "OPTIONS":
        return "", 204

    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT * FROM demo_game_rounds
            WHERE round_id = ?
        """, (round_id,)).fetchone()

        if not row:
            return jsonify({
                "success": False,
                "message": "Round not found"
            }), 404

        if time.time() < row["end_time"]:
            return jsonify({
                "success": False,
                "message": "Result is not revealed yet"
            }), 403

        if row["status"] == "active":
            conn.execute("""
                UPDATE demo_game_rounds
                SET status = 'completed'
                WHERE round_id = ?
            """, (round_id,))
            conn.commit()

        pulse = row["pulse"]
        blade = row["blade"]

        winner = (
            "PULSE" if pulse > blade
            else "BLADE" if blade > pulse
            else "TIE"
        )

        return jsonify({
            "success": True,
            "round_id": row["round_id"],
            "pulse": pulse,
            "blade": blade,
            "winner": winner,
            "commitment": row["commitment"],
            "status": "completed"
        })
    except Exception:
        app.logger.exception("Round result error")
        return jsonify({"success": False, "message": "Server error"}), 500
    finally:
        conn.close()


@app.route("/api/demo/round/history", methods=["GET", "OPTIONS"])
def round_history():
    if request.method == "OPTIONS":
        return "", 204

    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT round_id, pulse, blade, status
            FROM demo_game_rounds
            WHERE status = 'completed'
            ORDER BY round_id DESC
            LIMIT 20
        """).fetchall()

        history = []

        for row in rows:
            pulse, blade = row["pulse"], row["blade"]

            winner = (
                "PULSE" if pulse > blade
                else "BLADE" if blade > pulse
                else "TIE"
            )

            history.append({
                "round_id": row["round_id"],
                "pulse": pulse,
                "blade": blade,
                "winner": winner
            })

        return jsonify({"success": True, "history": history})
    except Exception:
        app.logger.exception("Round history error")
        return jsonify({"success": False, "message": "Server error"}), 500
    finally:
        conn.close()


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "DualClash Demo API is running"
    })


init_db()
