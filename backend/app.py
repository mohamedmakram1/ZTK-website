from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
import datetime
import logging
import os
from models import (
    init_db, get_user_by_username, get_all_users, create_user,
    toggle_user_active as toggle_user_active_db, reset_user_password, delete_user as delete_user_db,
    get_all_logs, add_log_entry, clear_all_logs,
    create_qr_code, get_user_qr_count_today, reset_user_qr_count_today
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
#CORS(app, resources={r"/*": {"origins": ["https://yourdomain.com"]}}) for production

# Configure logging
logging.basicConfig(level=logging.INFO)

# Global error handlers
@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
    return jsonify({
        "error": "Something went wrong",
        "message": str(e)  # for dev 
    }), 500

@app.errorhandler(404)
def handle_404(e):
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(400)
def handle_400(e):
    return jsonify({"error": "Bad Request"}), 400

# Initialize database on startup
init_db()

# Routes
app.config['JWT_SECRET_KEY'] = 'super-secsdfsdfgsdvavcwry5uk,i.oikujrfsret-key'
jwt = JWTManager(app)

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return jsonify({'message': 'Login endpoint'})
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = get_user_by_username(username)

    if user and check_password_hash(user['password'], password):
        token = create_access_token(identity=user['username'])
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'username': user['username'],
            'role': user['role']
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/auth/status', methods=['GET'])
@jwt_required()
def auth_status():
    current_user = get_jwt_identity()
    return jsonify({"authenticated": True, "user": current_user}), 200

@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({"logged_in_as": current_user}), 200

@app.route('/users', methods=['GET'])
def get_users():
    users = get_all_users()
    return jsonify(users)

@app.route('/add_user', methods=['POST'])
def add_user():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    success = create_user(username, password, role)
    if success:
        return jsonify({'message': 'User created'}), 201
    else:
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/users/<username>/activate', methods=['POST'])
def toggle_user_active(username):
    toggle_user_active_db(username)
    return jsonify({'message': 'User status updated'})

@app.route('/users/<username>/reset-password', methods=['POST'])
def reset_password(username):
    data = request.json
    new_password = data.get('password')
    if not new_password:
        return jsonify({'error': 'New password required'}), 400

    reset_user_password(username, new_password)
    return jsonify({'message': 'Password reset'})

@app.route('/users/<username>', methods=['DELETE'])
@jwt_required()
def delete_user(username):
    delete_user_db(username)
    return jsonify({'message': 'User deleted'})

@app.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    logs = get_all_logs()
    return jsonify(logs)

@app.route('/logs', methods=['POST'])
@jwt_required()
@cross_origin()
def add_log():
    # Log request metadata
    print(f"Request received: {request.method} {request.path} from {request.remote_addr}")

    data = request.json
    if not data:
        return jsonify({'error': 'Invalid JSON payload'}), 400

    log_type = data.get('type')
    message = data.get('message')
    user = data.get('user')

    print(f"Received data: {data}")
    print(f"Extracted: user={user}, type={log_type}, message={message}")

    if not log_type:
        return jsonify({'error': 'Missing required fields: type'}), 422
    if  not message:
        return jsonify({'error': 'Missing required fields: message'}), 422

    if not user:
        return jsonify({'error': 'Missing required field: user'}), 422

    print(f"Adding log: user={user}, type={log_type}, message={message}")
    add_log_entry(user, log_type, message)
    return jsonify({'message': 'Log added'})
    
@app.route('/clear-logs', methods=['DELETE'])
@jwt_required()
def clear_logs():
    clear_all_logs()
    return jsonify({'message': 'Logs have been deleted!'})

@app.route('/generate-qr', methods=['POST'])
@jwt_required()
def generate_qr():
    data = request.json
    username = data.get('username')
    # Generate random 6-digit PIN
    import random
    pin = ''.join([str(random.randint(0, 9)) for _ in range(6)])

    # Set expiration (15 minutes from now)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

    qr_data = create_qr_code(username, pin, expires_at)

    return jsonify({
        'pin': qr_data['pin'],
        'expires_at': qr_data['expires_at'].isoformat()
    })

@app.route('/user-qr-count/<username>', methods=['GET'])
@jwt_required()
def get_user_qr_count(username):
    count = get_user_qr_count_today(username)
    return jsonify({'count': count})

@app.route('/user-qr-reset/<username>', methods=['GET'])
@jwt_required()
def reset_user_qr_count(username):
    reset_user_qr_count_today(username)
    return jsonify({'message': 'User QR count reset for today'})

if __name__ == '__main__':
    app.run(debug=True)
