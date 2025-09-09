import psycopg2
import psycopg2.extras
from werkzeug.security import generate_password_hash
import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    try:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'zktdb'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )
    except Exception as e:
        print(f"Error in get_db_connection: {e}")
        return None

def init_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(20) PRIMARY KEY,
                password VARCHAR(256) NOT NULL,
                role VARCHAR(10) NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        ''')

        cur.execute('''
            CREATE TABLE  IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                username VARCHAR(80) NOT NULL,
                type VARCHAR(40),
                message VARCHAR(255)
            );
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS qr_codes (
                username VARCHAR(20),
                pin VARCHAR(10) PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
            )
        ''')
        conn.commit()
        cur.close()
        conn.close()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")

# User-related database operations
def get_user_by_username(username):
    conn = get_db_connection()
    if conn is None:
        return None
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT * FROM users WHERE username = %s AND active = TRUE', (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def get_all_users():
    conn = get_db_connection()
    if conn is None:
        return []
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT username, role, active FROM users')
    users = cur.fetchall()
    cur.close()
    conn.close()
    return users

def create_user(username, password, role='user'):
    conn = get_db_connection()
    if conn is None:
        return False
    cur = conn.cursor()
    try:
        cur.execute('INSERT INTO users (username, password, role) VALUES (%s, %s, %s)',
                  (username, generate_password_hash(password), role))
        conn.commit()
        return True
    except psycopg2.IntegrityError:
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

def toggle_user_active(username):
    conn = get_db_connection()
    if conn is None:
        return
    cur = conn.cursor()
    cur.execute('UPDATE users SET active = NOT active WHERE username = %s', (username,))
    conn.commit()
    cur.close()
    conn.close()

def reset_user_password(username, new_password):
    conn = get_db_connection()
    if conn is None:
        return
    cur = conn.cursor()
    cur.execute('UPDATE users SET password = %s WHERE username = %s',
               (generate_password_hash(new_password), username))
    conn.commit()
    cur.close()
    conn.close()

def delete_user(username):
    conn = get_db_connection()
    if conn is None:
        return
    cur = conn.cursor()
    cur.execute('DELETE FROM users WHERE username = %s', (username,))
    conn.commit()
    cur.close()
    conn.close()

# Log-related database operations
def get_all_logs():
    conn = get_db_connection()
    if conn is None:
        return []
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT * FROM logs ORDER BY time DESC')
    logs = cur.fetchall()
    cur.close()
    conn.close()
    return logs

def add_log_entry(username, log_type, message):
    conn = get_db_connection()
    if conn is None:
        return
    cur = conn.cursor()
    cur.execute('INSERT INTO logs (username, type, message) VALUES (%s, %s, %s)',
               (username, log_type, message))
    conn.commit()
    cur.close()
    conn.close()

def clear_all_logs():
    conn = get_db_connection()
    if conn is None:
        return
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('DELETE FROM logs')
    conn.commit()
    cur.close()
    conn.close()

# QR Code-related database operations
def create_qr_code(username, pin, expires_at):
    conn = get_db_connection()
    if conn is None:
        return None
    cur = conn.cursor()
    cur.execute('INSERT INTO qr_codes (username, pin, expires_at) VALUES (%s, %s, %s)',
               (username, pin, expires_at))
    conn.commit()
    cur.close()
    conn.close()
    return {'pin': pin, 'expires_at': expires_at}

def get_user_qr_count_today(username):
    today = datetime.date.today()
    conn = get_db_connection()
    if conn is None:
        return 0
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM qr_codes WHERE username = %s AND DATE(created_at) = %s',
               (username, today))
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return count

def reset_user_qr_count_today(username):
    today = datetime.date.today()
    conn = get_db_connection()
    if conn is None:
        return
    cur = conn.cursor()
    cur.execute('DELETE FROM qr_codes WHERE username = %s AND DATE(created_at) = %s',
               (username, today))
    conn.commit()
    cur.close()
    conn.close()
