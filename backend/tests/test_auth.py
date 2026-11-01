from app.core.security import get_password_hash, verify_password, create_access_token

def test_password_hashing():
    password = "secret_aqua_password_2026"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_jwt_token_generation():
    token = create_access_token(subject=123, role="ADMINISTRATOR")
    assert isinstance(token, str)
    assert len(token) > 20

def test_user_registration_and_login(client):
    reg_data = {
        "email": "test_operator@aquaguard.io",
        "password": "Password123!",
        "full_name": "Test Operator",
        "role": "OPERATOR"
    }
    # Register
    res = client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["email"] == "test_operator@aquaguard.io"
    assert body["full_name"] == "Test Operator"

    # Login
    login_data = {
        "email": "test_operator@aquaguard.io",
        "password": "Password123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_data)
    assert res_login.status_code == 200, res_login.text
    token_body = res_login.json()
    assert "access_token" in token_body
    assert token_body["role"] == "OPERATOR"
