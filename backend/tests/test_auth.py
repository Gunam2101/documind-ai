import pytest

def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "securepassword123"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "jane@example.com"

def test_login_user(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["id"] == test_user.id

def test_login_invalid_password(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401

def test_get_me(client, auth_headers, test_user):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
